import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import { supabase } from '@/lib/supabase'
import CoordinatorSidebar from '@/components/CoordinatorSidebar'
import AlertCard from '@/components/AlertCard'
import { Mic, MicOff, Activity, Send, Megaphone } from 'lucide-react'
import type { Event } from '@/lib/types'

export default function CoordinatorApp() {
  const { pinSession, profile } = useAuthStore()
  const { zones, alerts, latestReadings, loadEvent, acknowledgeAlert, sendStewardMessage, triggerAlert } = useEventStore()
  const [activeTab, setActiveTab] = useState<'zone' | 'comms' | 'alerts'>('zone')
  const [isPTTActive, setIsPTTActive] = useState(false)
  const [textMessage, setTextMessage] = useState('')
  const [messageSent, setMessageSent] = useState(false)
  const [eventDetails, setEventDetails] = useState<Event | null>(null)

  const eventId = pinSession?.eventId || ''
  const zoneId = pinSession?.zoneId || ''

  useEffect(() => {
    if (eventId) {
      loadEvent(eventId)
      loadEventDetails(eventId)
    }
  }, [eventId])

  const loadEventDetails = async (id: string) => {
    const { data } = await supabase.from('events').select('*').eq('id', id).single()
    if (data) setEventDetails(data)
  }

  const myZone = zones.find(z => z.id === zoneId)
  const myReading = zoneId ? latestReadings[zoneId] : undefined

  // Show zone-specific alerts AND broadcast alerts (zone_id is null = from manager)
  const myAlerts = alerts.filter(a => a.zone_id === zoneId || a.zone_id === null)
  const broadcastAlerts = alerts.filter(a => a.zone_id === null)
  const unreadCount = myAlerts.filter(a => a.status === 'TRIGGERED').length

  const profileId = profile?.id || ''

  const percentage = myZone && myZone.capacity > 0
    ? Math.min(100, Math.round(((myReading?.density || 0) / myZone.capacity) * 100))
    : 0
  const riskScore = myReading?.risk_score || 0
  const colorState = myReading?.color_state || 'GREEN'
  const riskColor = colorState === 'RED'
    ? 'var(--color-danger-pulse)'
    : colorState === 'YELLOW'
    ? 'var(--color-warning)'
    : 'var(--color-safe)'

  const handleReport = async (status: 'ALL_CLEAR' | 'CROWD_BUILDING' | 'EMERGENCY') => {
    if (!pinSession) return
    try {
      await sendStewardMessage(eventId, zoneId, pinSession.staffId, status)
    } catch (err) {
      console.error('Failed to send status update')
    }
  }

  const handleSendMessage = async () => {
    if (!textMessage.trim() || !pinSession) return
    try {
      await sendStewardMessage(eventId, zoneId || null, pinSession.staffId, 'ALL_CLEAR', textMessage.trim())
      setTextMessage('')
      setMessageSent(true)
      setTimeout(() => setMessageSent(false), 2500)
    } catch (err) {
      console.error('Failed to send message')
    }
  }

  const handleSendEmergencyAlert = async () => {
    if (!pinSession || !eventId) return
    try {
      await sendStewardMessage(eventId, zoneId || null, pinSession.staffId, 'EMERGENCY')
      await triggerAlert(
        eventId,
        zoneId || null,
        'OTHER', // mapped as STAMPEDE/EMERGENCY
        'CRITICAL',
        `🚨 Emergency reported by ${pinSession.displayName} at Zone ${myZone?.label || '?'}`,
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
        {/* Event Info Header */}
        <header className="virtus-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 600 }}>{eventDetails?.name ?? 'Loading Event...'}</span>
            {eventDetails?.status === 'ACTIVE' && (
              <span className="live-indicator"><span className="live-indicator__dot" /> LIVE</span>
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
              <Megaphone size={14} /> {broadcastAlerts.filter(a => a.status === 'TRIGGERED').length} URGENT
            </button>
          )}
        </header>

        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          {/* My Zone Tab */}
          {activeTab === 'zone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="v-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--v-orange)', marginBottom: '4px' }}>
                      Zone {myZone?.label || '?'}
                    </h2>
                    {myZone?.name && <p style={{ color: 'var(--v-text-main)', opacity: 0.7, fontSize: '14px' }}>{myZone.name}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: riskColor }}>{riskScore}</div>
                    <div style={{ fontSize: '12px', color: 'var(--v-text-main)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Score</div>
                  </div>
                </div>

                {/* Density Meter */}
                <div style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--v-text-main)', opacity: 0.7 }}>Live Occupancy</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: riskColor }}>{percentage}% ({myReading?.density || 0} people)</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{ 
                        height: '100%', 
                        width: `${percentage}%`,
                        background: colorState === 'RED' ? 'var(--color-danger-pulse)' : colorState === 'YELLOW' ? 'var(--color-warning)' : 'var(--v-orange)',
                        transition: 'width 0.5s ease-out, background-color 0.5s ease'
                      }}
                    />
                  </div>
                </div>

                {/* Flow Rate */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--v-border)' }}>
                  <span style={{ fontSize: '14px', color: 'var(--v-text-main)', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={16} />
                    Flow Rate
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>
                    {(myReading?.flow_rate || 0).toFixed(1)} m/min
                  </span>
                </div>

                {/* Risk Type */}
                {myReading?.risk_type && myReading.risk_type !== 'NORMAL' && (
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
                      {myReading.risk_type.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Report Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <button 
                  onClick={() => handleReport('ALL_CLEAR')}
                  style={{ background: 'rgba(77, 255, 77, 0.1)', color: '#4dff4d', border: '1px solid rgba(77, 255, 77, 0.3)', padding: '16px', borderRadius: '12px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  ✅ Mark All Clear
                </button>
                <button 
                  onClick={() => handleReport('CROWD_BUILDING')}
                  style={{ background: 'rgba(255, 170, 0, 0.1)', color: '#ffaa00', border: '1px solid rgba(255, 170, 0, 0.3)', padding: '16px', borderRadius: '12px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  ⚠️ Crowd Building
                </button>
                <button
                  onClick={handleSendEmergencyAlert}
                  style={{ background: 'var(--color-danger-pulse)', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}
                >
                  🚨 Send Emergency Alert to Manager
                </button>
              </div>
            </div>
          )}

          {/* Communicate Tab */}
          {activeTab === 'comms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="v-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
                <button
                  className={`ptt-button ${isPTTActive ? 'ptt-button--transmitting' : ''}`}
                  onMouseDown={() => setIsPTTActive(true)}
                  onMouseUp={() => setIsPTTActive(false)}
                  onTouchStart={() => setIsPTTActive(true)}
                  onTouchEnd={() => setIsPTTActive(false)}
                  style={{
                    width: '120px', height: '120px', borderRadius: '50%', border: 'none',
                    background: isPTTActive ? 'var(--color-danger-pulse)' : 'var(--v-bg-dark)',
                    boxShadow: isPTTActive ? '0 0 40px rgba(255, 60, 60, 0.4)' : 'inset 0 0 20px rgba(0,0,0,0.5), 0 0 0 1px var(--v-border)',
                    color: isPTTActive ? '#fff' : 'var(--v-orange)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.1s'
                  }}
                >
                  {isPTTActive ? <MicOff size={48} /> : <Mic size={48} />}
                </button>
                <p style={{ marginTop: '24px', fontSize: '14px', color: 'var(--v-text-main)', opacity: 0.6, textAlign: 'center' }}>
                  {isPTTActive ? '🔴 Transmitting on Zone channel...' : 'Hold to talk on Zone channel'}
                </p>
              </div>

              <div className="v-card">
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Send Message to Event Manager</h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    placeholder="Type message..."
                    value={textMessage}
                    onChange={e => setTextMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    style={{ flex: 1, background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '14px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!textMessage.trim()}
                    style={{ background: 'var(--v-orange)', color: '#000', border: 'none', borderRadius: '10px', padding: '0 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !textMessage.trim() ? 0.5 : 1 }}
                  >
                    <Send size={18} />
                  </button>
                </div>
                {messageSent && (
                  <p style={{ color: '#4dff4d', fontSize: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ✅ Message sent to Event Manager
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Broadcast alerts from manager shown at top */}
              {broadcastAlerts.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '12px', color: 'var(--v-orange)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    📢 Broadcast from Manager
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
                Zone Alerts
              </h4>

              {/* Zone-specific alerts */}
              {myAlerts.filter(a => a.zone_id === zoneId).length === 0 ? (
                <div className="v-card" style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.6 }}>
                  <p style={{ fontSize: '14px' }}>No alerts for your zone.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myAlerts.filter(a => a.zone_id === zoneId).map(a => (
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
