import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import { supabase } from '@/lib/supabase'
import CoordinatorSidebar from '@/components/CoordinatorSidebar'
import AlertCard from '@/components/AlertCard'
import { Mic, MicOff, Activity, Send, Megaphone, ChevronDown } from 'lucide-react'
import type { Event } from '@/lib/types'
import { useLang } from '@/contexts/LanguageContext'

export default function CoordinatorApp() {
  const { pinSession, profile } = useAuthStore()
  const { zones, alerts, staff, stewardUpdates, instructions, latestReadings, loadEvent, acknowledgeAlert, sendStewardMessage, triggerAlert } = useEventStore()
  const { t } = useLang()
  const [activeTab, setActiveTab] = useState<'zone' | 'comms' | 'alerts'>('zone')
  const [commsView, setCommsView] = useState<'send' | 'inbox'>('send')
  const [isPTTActive, setIsPTTActive] = useState(false)
  const [textMessage, setTextMessage] = useState('')      // manager message
  const [messageSent, setMessageSent] = useState(false)
  const [eventDetails, setEventDetails] = useState<Event | null>(null)

  // DM to coordinator
  const [dmRecipientId, setDmRecipientId] = useState<string>('')
  const [dmMessage, setDmMessage] = useState('')
  const [dmSent, setDmSent] = useState(false)
  const [dmSending, setDmSending] = useState(false)

  // Zone selector: default to coordinator's assigned zone, but they can switch
  const [selectedZoneId, setSelectedZoneId] = useState<string>('')

  // Track which zone just had a status sent (for feedback)
  const [lastReportedStatus, setLastReportedStatus] = useState<string | null>(null)
  const [reportSent, setReportSent] = useState(false)

  // Per-button click counters and animation triggers
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({ ALL_CLEAR: 0, CROWD_BUILDING: 0, EMERGENCY: 0 })
  const [animatingButton, setAnimatingButton] = useState<string | null>(null)

  const eventId = pinSession?.eventId || ''
  const assignedZoneId = pinSession?.zoneId || ''

  useEffect(() => {
    if (eventId) {
      loadEvent(eventId)
      loadEventDetails(eventId)
    }
  }, [eventId])

  // Set default selected zone to assigned zone once zones load
  useEffect(() => {
    if (!selectedZoneId && zones.length > 0) {
      setSelectedZoneId(assignedZoneId || zones[0].id)
    }
  }, [zones, assignedZoneId, selectedZoneId])

  const loadEventDetails = async (id: string) => {
    const { data } = await supabase.from('events').select('*').eq('id', id).single()
    if (data) setEventDetails(data)
  }

  // Use selected zone (not just assigned zone)
  const selectedZone = zones.find(z => z.id === selectedZoneId)
  const selectedReading = selectedZoneId ? latestReadings[selectedZoneId] : undefined

  // Show all alerts for any zone the coordinator can see + broadcasts
  const broadcastAlerts = alerts.filter(a => a.zone_id === null)
  const allZoneAlerts = alerts.filter(a => a.zone_id !== null && a.status === 'TRIGGERED')
  const unreadCount = broadcastAlerts.filter(a => a.status === 'TRIGGERED').length + allZoneAlerts.length

  // Inbox: messages FROM the manager (instructions) + DMs TO this coordinator from other coordinators
  const myStaffId = pinSession?.staffId || ''
  const managerMessages = instructions  // all instructions are from manager to this event
  const dmMessages = stewardUpdates.filter(
    u => u.recipient_staff_id === myStaffId && u.message
  )
  const inboxTotal = managerMessages.length + dmMessages.length

  const profileId = profile?.id || ''

  const percentage = selectedZone && selectedZone.capacity > 0
    ? Math.min(100, Math.round(((selectedReading?.density || 0) / selectedZone.capacity) * 100))
    : 0

  // Compute color from live percentage (same as ManagerZones fix)
  let riskColor = 'var(--color-safe)'
  let progressColor = 'var(--v-orange)'
  if (percentage >= 85) {
    riskColor = 'var(--color-danger-pulse)'
    progressColor = 'var(--color-danger-pulse)'
  } else if (percentage >= 60) {
    riskColor = 'var(--color-warning)'
    progressColor = 'var(--color-warning)'
  }

  const riskScore = selectedReading?.risk_score || 0

  const handleReport = async (status: 'ALL_CLEAR' | 'CROWD_BUILDING' | 'EMERGENCY') => {
    if (!pinSession || !selectedZoneId) return
    // Trigger animation
    setAnimatingButton(status)
    setTimeout(() => setAnimatingButton(null), 600)
    try {
      await sendStewardMessage(eventId, selectedZoneId, pinSession.staffId, status)
      setReportCounts(prev => ({ ...prev, [status]: (prev[status] || 0) + 1 }))
      setLastReportedStatus(status)
      setReportSent(true)
      setTimeout(() => setReportSent(false), 2500)
    } catch (err) {
      console.error('Failed to send status update')
    }
  }

  const handleSendMessage = async () => {
    if (!textMessage.trim() || !pinSession) return
    try {
      await sendStewardMessage(eventId, selectedZoneId || null, pinSession.staffId, 'ALL_CLEAR', `[TO MANAGER] ${textMessage.trim()}`)
      setTextMessage('')
      setMessageSent(true)
      setTimeout(() => setMessageSent(false), 2500)
    } catch (err) {
      console.error('Failed to send message')
    }
  }

  const handleSendDM = async () => {
    if (!dmMessage.trim() || !pinSession || !dmRecipientId) return
    setDmSending(true)
    try {
      await sendStewardMessage(
        eventId,
        selectedZoneId || null,
        pinSession.staffId,
        'ALL_CLEAR',
        `[DM] ${dmMessage.trim()}`,
        dmRecipientId
      )
      setDmMessage('')
      setDmSent(true)
      setTimeout(() => setDmSent(false), 2500)
    } catch (err) {
      console.error('Failed to send DM')
    } finally {
      setDmSending(false)
    }
  }

  const handleSendEmergencyAlert = async () => {
    if (!pinSession || !eventId || !selectedZoneId) return
    setAnimatingButton('EMERGENCY')
    setTimeout(() => setAnimatingButton(null), 600)
    try {
      await sendStewardMessage(eventId, selectedZoneId, pinSession.staffId, 'EMERGENCY')
      setReportCounts(prev => ({ ...prev, EMERGENCY: (prev.EMERGENCY || 0) + 1 }))
      await triggerAlert(
        eventId,
        selectedZoneId,
        'OTHER',
        'CRITICAL',
        `🚨 Emergency reported by ${pinSession.displayName} at Zone ${selectedZone?.label || '?'}`,
        pinSession.staffId
      )
    } catch (err) {
      console.error('Failed to send emergency alert')
    }
  }

  return (
    <div className="virtus-layout">
      <CoordinatorSidebar activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={unreadCount} />

      <main className="virtus-main">
        {/* Animation keyframes injected inline */}
        <style>{`
          @keyframes btn-ripple {
            0% { box-shadow: 0 0 0 0 currentColor; opacity: 0.8; }
            70% { box-shadow: 0 0 0 18px transparent; opacity: 0; }
            100% { box-shadow: 0 0 0 0 transparent; opacity: 0; }
          }
          @keyframes badge-pop {
            0% { transform: scale(1); }
            40% { transform: scale(1.55); }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); }
          }
          .report-btn { position: relative; transition: transform 0.12s, opacity 0.15s; }
          .report-btn:active { transform: scale(0.97); }
          .report-btn.animating { animation: btn-ripple 0.6s ease-out; }
          .report-badge {
            position: absolute;
            top: -8px; right: -8px;
            min-width: 22px; height: 22px;
            border-radius: 11px;
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 800;
            line-height: 1; padding: 0 5px;
            border: 2px solid var(--v-bg-dark);
            pointer-events: none;
          }
          .report-badge.popping { animation: badge-pop 0.4s ease; }
        `}</style>
        {/* Event Info Header */}
        <header className="virtus-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 600 }}>{eventDetails?.name ?? t('loading')}</span>
            {eventDetails?.status === 'ACTIVE' && (
              <span className="live-indicator"><span className="live-indicator__dot" /> {t('live')}</span>
            )}
            {eventDetails?.status === 'PAUSED' && (
              <span style={{ fontSize: '10px', background: 'var(--color-warning)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                PAUSED
              </span>
            )}
          </div>
          
          {broadcastAlerts.filter(a => a.status === 'TRIGGERED').length > 0 && (
            <button
              style={{
                background: 'rgba(255, 60, 60, 0.1)',
                border: '1px solid var(--color-danger-pulse)',
                color: 'var(--color-danger-pulse)',
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                animation: 'pulse 2s infinite'
              }}
              onClick={() => setActiveTab('alerts')}
            >
              <Megaphone size={14} /> {broadcastAlerts.filter(a => a.status === 'TRIGGERED').length} {t('coordUrgent')}
            </button>
          )}
        </header>

        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          {/* My Zone Tab */}
          {activeTab === 'zone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Zone Selector */}
              <div className="v-card" style={{ padding: '16px 20px' }}>
                <label style={{ fontSize: '12px', color: 'var(--v-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '10px', display: 'block' }}>
                  {t('coordReportingForZone')}
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedZoneId}
                    onChange={e => setSelectedZoneId(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--v-bg-dark)',
                      border: '1px solid var(--v-border)',
                      color: 'var(--v-text-main)',
                      borderRadius: '10px',
                      padding: '12px 40px 12px 16px',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                    }}
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>
                        Zone {z.label}{z.name ? ` — ${z.name}` : ''}{z.id === assignedZoneId ? ' (My Zone)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                </div>
                {selectedZoneId !== assignedZoneId && (
                  <p style={{ fontSize: '11px', marginTop: '8px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚠️ Reporting for a different zone. Your assigned zone is {zones.find(z => z.id === assignedZoneId)?.label || '—'}.
                  </p>
                )}
              </div>

              {/* Zone Stats Card */}
              <div className="v-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--v-orange)', marginBottom: '4px' }}>
                      Zone {selectedZone?.label || '?'}
                    </h2>
                    {selectedZone?.name && <p style={{ color: 'var(--v-text-main)', opacity: 0.7, fontSize: '14px' }}>{selectedZone.name}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: riskColor }}>{riskScore}</div>
                    <div style={{ fontSize: '12px', color: 'var(--v-text-main)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('coordRiskScore')}</div>
                  </div>
                </div>

                {/* Density Meter */}
                <div style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--v-text-main)', opacity: 0.7 }}>{t('coordLiveOccupancy')}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: riskColor }}>
                      {percentage}% ({selectedReading?.density || 0} / {selectedZone?.capacity || 0} {t('guestPeople')})
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: progressColor,
                        transition: 'width 0.5s ease-out, background-color 0.5s ease'
                      }}
                    />
                  </div>
                </div>

                {/* Flow Rate */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--v-border)' }}>
                  <span style={{ fontSize: '14px', color: 'var(--v-text-main)', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={16} />
                    {t('coordFlowRate')}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>
                    {(selectedReading?.flow_rate || 0).toFixed(1)} m/min
                  </span>
                </div>

                {/* Risk Type */}
                {selectedReading?.risk_type && selectedReading.risk_type !== 'NORMAL' && (
                  <div style={{
                    marginTop: '20px',
                    padding: '12px',
                    background: 'rgba(255, 60, 60, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-danger-pulse)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Megaphone size={16} color="var(--color-danger-pulse)" />
                    <span style={{ fontWeight: 600, color: 'var(--color-danger-pulse)', fontSize: '14px' }}>
                      {selectedReading.risk_type.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Report Sent Feedback */}
              {reportSent && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(77,255,77,0.1)',
                  border: '1px solid rgba(77,255,77,0.3)',
                  borderRadius: '10px',
                  color: '#4dff4d',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  ✅ Status "{lastReportedStatus?.replace('_', ' ')}" sent to manager for Zone {selectedZone?.label}
                </div>
              )}

              {/* Quick Report Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <button
                  onClick={() => handleReport('ALL_CLEAR')}
                  className={`report-btn${animatingButton === 'ALL_CLEAR' ? ' animating' : ''}`}
                  style={{ background: 'rgba(77, 255, 77, 0.1)', color: '#4dff4d', border: '1px solid rgba(77, 255, 77, 0.3)', padding: '16px', borderRadius: '12px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  ✅ {t('coordMarkAllClear')}
                  {reportCounts.ALL_CLEAR > 0 && (
                    <span className={`report-badge${animatingButton === 'ALL_CLEAR' ? ' popping' : ''}`} style={{ background: '#4dff4d', color: '#000' }}>
                      {reportCounts.ALL_CLEAR}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleReport('CROWD_BUILDING')}
                  className={`report-btn${animatingButton === 'CROWD_BUILDING' ? ' animating' : ''}`}
                  style={{ background: 'rgba(255, 170, 0, 0.1)', color: '#ffaa00', border: '1px solid rgba(255, 170, 0, 0.3)', padding: '16px', borderRadius: '12px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  ⚠️ {t('coordCrowdBuilding')}
                  {reportCounts.CROWD_BUILDING > 0 && (
                    <span className={`report-badge${animatingButton === 'CROWD_BUILDING' ? ' popping' : ''}`} style={{ background: '#ffaa00', color: '#000' }}>
                      {reportCounts.CROWD_BUILDING}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleSendEmergencyAlert}
                  className={`report-btn${animatingButton === 'EMERGENCY' ? ' animating' : ''}`}
                  style={{ background: 'var(--color-danger-pulse)', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}
                >
                  🚨 {t('coordSendEmergencyAlert')}
                  {reportCounts.EMERGENCY > 0 && (
                    <span className={`report-badge${animatingButton === 'EMERGENCY' ? ' popping' : ''}`} style={{ background: '#fff', color: 'var(--color-danger-pulse)' }}>
                      {reportCounts.EMERGENCY}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Communicate Tab */}
          {activeTab === 'comms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Send / Inbox switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => setCommsView('send')}
                  style={{
                    padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                    background: commsView === 'send' ? 'var(--v-orange)' : 'var(--v-bg-dark)',
                    color: commsView === 'send' ? '#000' : 'var(--v-text-main)',
                  }}
                >
                  ✉️ {t('coordSend')}
                </button>
                <button
                  onClick={() => setCommsView('inbox')}
                  style={{
                    padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s', position: 'relative',
                    background: commsView === 'inbox' ? 'var(--v-orange)' : 'var(--v-bg-dark)',
                    color: commsView === 'inbox' ? '#000' : 'var(--v-text-main)',
                  }}
                >
                  📥 {t('coordInbox')}
                  {inboxTotal > 0 && (
                    <span style={{
                      position: 'absolute', top: '-6px', right: '-6px',
                      background: 'var(--color-danger-pulse)', color: '#fff',
                      borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: 800,
                    }}>{inboxTotal}</span>
                  )}
                </button>
              </div>

              {/* ── SEND VIEW ── */}
              {commsView === 'send' && (
                <>
                  {/* PTT */}
                  <div className="v-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px', gap: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--v-text-muted)' }}>Zone Broadcast Channel</div>
                    <button
                      onMouseDown={() => setIsPTTActive(true)}
                      onMouseUp={() => setIsPTTActive(false)}
                      onTouchStart={() => setIsPTTActive(true)}
                      onTouchEnd={() => setIsPTTActive(false)}
                      style={{
                        width: '90px', height: '90px', borderRadius: '50%', border: 'none',
                        background: isPTTActive ? 'var(--color-danger-pulse)' : 'var(--v-bg-dark)',
                        boxShadow: isPTTActive ? '0 0 40px rgba(255,60,60,0.4)' : 'inset 0 0 20px rgba(0,0,0,0.5), 0 0 0 1px var(--v-border)',
                        color: isPTTActive ? '#fff' : 'var(--v-orange)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s'
                      }}
                    >
                      {isPTTActive ? <MicOff size={36} /> : <Mic size={36} />}
                    </button>
                    <p style={{ fontSize: '12px', color: 'var(--v-text-main)', opacity: 0.55, textAlign: 'center' }}>
                      {isPTTActive ? '🔴 Transmitting...' : 'Hold to broadcast on zone channel'}
                    </p>
                  </div>

                  {/* Message Manager */}
                  <div className="v-card">
                    <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      👔 {t('coordSendMsgToManager')}
                    </h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        placeholder={t('coordTypeMessage')}
                        value={textMessage}
                        onChange={e => setTextMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        style={{ flex: 1, background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', borderRadius: '10px', padding: '11px 14px', color: '#fff', fontSize: '14px' }}
                      />
                      <button onClick={handleSendMessage} disabled={!textMessage.trim()}
                        style={{ background: 'var(--v-orange)', color: '#000', border: 'none', borderRadius: '10px', padding: '0 18px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !textMessage.trim() ? 0.5 : 1 }}>
                        <Send size={16} />
                      </button>
                    </div>
                    {messageSent && <p style={{ color: '#4dff4d', fontSize: '12px', marginTop: '8px' }}>✅ Sent to Event Manager</p>}
                  </div>

                  {/* DM to Coordinator */}
                  <div className="v-card">
                    <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      💬 {t('coordDM')}
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', maxHeight: '220px', overflowY: 'auto' }}>
                      {zones.map(z => {
                        const zoneStaff = staff.filter(s => s.zone_id === z.id && s.id !== pinSession?.staffId)
                        if (zoneStaff.length === 0) return null
                        return (
                          <div key={z.id}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '6px 0 4px 4px' }}>
                              Zone {z.label}{z.name ? ` — ${z.name}` : ''}
                            </div>
                            {zoneStaff.map(s => (
                              <div key={s.id} onClick={() => setDmRecipientId(s.id)} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '9px 12px', borderRadius: '10px', marginBottom: '4px',
                                background: dmRecipientId === s.id ? 'rgba(255,170,0,0.12)' : 'var(--v-bg-dark)',
                                border: `1px solid ${dmRecipientId === s.id ? 'var(--v-orange)' : 'var(--v-border)'}`,
                                cursor: 'pointer', transition: 'all 0.15s'
                              }}>
                                <div className="v-avatar" style={{ width: '28px', height: '28px', fontSize: '10px', flexShrink: 0 }}>
                                  {(s.display_name || 'C').substring(0, 2).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{s.display_name || 'Coordinator'}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--v-text-muted)' }}>{s.role.replace('_', ' ')}</div>
                                </div>
                                {dmRecipientId === s.id && <span style={{ fontSize: '10px', color: 'var(--v-orange)', fontWeight: 700 }}>✓</span>}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                      {staff.filter(s => s.id !== pinSession?.staffId).length === 0 && (
                        <p style={{ fontSize: '13px', opacity: 0.4, textAlign: 'center', padding: '16px 0' }}>No other coordinators</p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        placeholder={dmRecipientId ? `Message ${staff.find(s => s.id === dmRecipientId)?.display_name || 'coordinator'}...` : 'Select a coordinator above...'}
                        value={dmMessage} disabled={!dmRecipientId}
                        onChange={e => setDmMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendDM()}
                        style={{ flex: 1, background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', borderRadius: '10px', padding: '11px 14px', color: '#fff', fontSize: '14px', opacity: !dmRecipientId ? 0.5 : 1 }}
                      />
                      <button onClick={handleSendDM} disabled={!dmMessage.trim() || !dmRecipientId || dmSending}
                        style={{ background: 'var(--v-orange)', color: '#000', border: 'none', borderRadius: '10px', padding: '0 18px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!dmMessage.trim() || !dmRecipientId) ? 0.5 : 1 }}>
                        <Send size={16} />
                      </button>
                    </div>
                    {dmSent && (
                      <p style={{ color: '#4dff4d', fontSize: '12px', marginTop: '8px' }}>
                        ✅ DM sent to {staff.find(s => s.id === dmRecipientId)?.display_name || 'coordinator'}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* ── INBOX VIEW ── */}
              {commsView === 'inbox' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                  {/* Manager instructions */}
                  {managerMessages.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                        📢 {t('coordFromManager')}
                      </div>
                      {[...managerMessages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(m => (
                        <div key={m.id} className="v-card" style={{ padding: '14px 16px', marginBottom: '8px', borderLeft: '3px solid var(--v-orange)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v-orange)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              👔 {t('coordEventManager')}
                              {m.is_broadcast && (
                                <span style={{ background: 'rgba(255,170,0,0.15)', color: 'var(--v-orange)', fontSize: '9px', padding: '1px 5px', borderRadius: '4px', marginLeft: '4px' }}>BROADCAST</span>
                              )}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--v-text-muted)' }}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ fontSize: '14px', color: 'var(--v-text-main)', margin: 0, lineHeight: 1.5 }}>{m.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* DMs from other coordinators */}
                  {dmMessages.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#4dff4d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                        💬 {t('coordDirectMessages')}
                      </div>
                      {[...dmMessages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(m => {
                        const sender = staff.find(s => s.id === m.staff_id)
                        const senderZone = zones.find(z => z.id === sender?.zone_id)
                        const cleanMsg = (m.message || '').replace(/^\[DM\]\s*/, '')
                        return (
                          <div key={m.id} className="v-card" style={{ padding: '14px 16px', marginBottom: '8px', borderLeft: '3px solid #4dff4d' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="v-avatar" style={{ width: '24px', height: '24px', fontSize: '9px' }}>
                                  {(sender?.display_name || 'C').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#4dff4d' }}>
                                    {sender?.display_name || 'Coordinator'}
                                  </span>
                                  {senderZone && (
                                    <span style={{ fontSize: '10px', color: 'var(--v-text-muted)', marginLeft: '6px' }}>Zone {senderZone.label}</span>
                                  )}
                                </div>
                              </div>
                              <span style={{ fontSize: '10px', color: 'var(--v-text-muted)' }}>
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--v-text-main)', margin: 0, lineHeight: 1.5 }}>{cleanMsg}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {inboxTotal === 0 && (
                    <div className="v-card" style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.5 }}>
                      <p style={{ fontSize: '14px' }}>📭 {t('coordNoMessages')}</p>
                      <p style={{ fontSize: '12px', marginTop: '6px' }}>{t('coordNoMessagesSub')}</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}



          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Broadcast alerts from manager shown at top */}
              {broadcastAlerts.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '12px', color: 'var(--v-orange)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    📢 {t('coordBroadcastFromManager')}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {broadcastAlerts.map(a => (
                      <AlertCard
                        key={a.id}
                        alert={a}
                        onAcknowledge={() => acknowledgeAlert(a.id, profileId)}
                      />
                    ))}
                  </div>
                  <div style={{ borderBottom: '1px solid var(--v-border)', margin: '24px 0 8px 0' }} />
                </div>
              )}

              <h4 style={{ fontSize: '12px', color: 'var(--v-text-main)', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                {t('coordAllZoneAlerts')}
              </h4>

              {allZoneAlerts.length === 0 ? (
                <div className="v-card" style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.6 }}>
                  <p style={{ fontSize: '14px' }}>{t('coordNoActiveZoneAlerts')}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {allZoneAlerts.map(a => (
                    <AlertCard
                      key={a.id}
                      alert={a}
                      onAcknowledge={() => acknowledgeAlert(a.id, profileId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
