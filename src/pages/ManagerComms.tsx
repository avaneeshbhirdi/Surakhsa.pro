import { useState, useEffect } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import { Send, Radio, User, Inbox, MessageCircle } from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'

export default function ManagerComms() {
  const { profile } = useAuthStore()
  const { activeEvent, zones, staff, stewardUpdates, loadEvent, sendInstruction } = useEventStore()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'compose' | 'inbox'>('compose')

  // Broadcast state
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastZone, setBroadcastZone] = useState<string | 'all'>('all')
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastSent, setBroadcastSent] = useState(false)

  // Personal message state
  const [personalMessage, setPersonalMessage] = useState('')
  const [personalStaff, setPersonalStaff] = useState<string>('')
  const [personalSending, setPersonalSending] = useState(false)
  const [personalSent, setPersonalSent] = useState(false)

  useEffect(() => {
    if (activeEvent) { setLoading(false); return }
    if (!profile) { setLoading(false); return }
    const loadActiveEvent = async () => {
      const { data: events } = await supabase
        .from('events').select('*')
        .eq('admin_id', profile.id)
        .in('status', ['ACTIVE', 'PAUSED', 'DRAFT'])
        .order('created_at', { ascending: false }).limit(1)
      if (events && events.length > 0) await loadEvent(events[0].id)
      setLoading(false)
    }
    loadActiveEvent()
  }, [profile?.id, activeEvent?.id])

  // Automatically select first staff member if none selected
  useEffect(() => {
    if (!personalStaff && staff.length > 0) {
      setPersonalStaff(staff[0].id)
    }
  }, [staff, personalStaff])

  const handleBroadcastSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastMessage.trim() || !activeEvent || !profile) return
    
    // Find the manager's staff ID
    const managerStaff = staff.find(s => s.profile_id === profile.id)
    if (!managerStaff) {
      alert("Manager staff record not found. Cannot send message.")
      return
    }

    setBroadcastSending(true)
    try {
      let zoneId: string | null = null
      let isBroadcast = false

      if (broadcastZone === 'all') {
        isBroadcast = true
      } else {
        zoneId = broadcastZone
      }

      await sendInstruction(activeEvent.id, zoneId, managerStaff.id, broadcastMessage.trim(), isBroadcast)
      setBroadcastSent(true)
      setBroadcastMessage('')
      setTimeout(() => setBroadcastSent(false), 2000)
    } catch (err: any) {
      alert(err.message || 'Failed to send broadcast')
    } finally {
      setBroadcastSending(false)
    }
  }

  const handlePersonalSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personalMessage.trim() || !personalStaff || !activeEvent || !profile) return

    // Find the manager's staff ID
    const managerStaff = staff.find(s => s.profile_id === profile.id)
    if (!managerStaff) {
      alert("Manager staff record not found. Cannot send message.")
      return
    }

    setPersonalSending(true)
    try {
      const targetStaff = staff.find(s => s.id === personalStaff)
      const zoneId = targetStaff?.zone_id || null
      // Personal messages are technically "broadcasts" to everyone if the staff doesn't have a zone,
      // but prefixed. If they do have a zone, it goes to that zone.
      // We will prefix the message so the coordinator knows it's direct.
      const isBroadcast = !zoneId
      const finalMessage = `[Direct to ${targetStaff?.display_name || 'Coordinator'}] ${personalMessage.trim()}`

      await sendInstruction(activeEvent.id, zoneId, managerStaff.id, finalMessage, isBroadcast)
      setPersonalSent(true)
      setPersonalMessage('')
      setTimeout(() => setPersonalSent(false), 2000)
    } catch (err: any) {
      alert(err.message || 'Failed to send personal message')
    } finally {
      setPersonalSending(false)
    }
  }

  const quickMessages = [
    'All clear — maintain positions.',
    'Please conduct a headcount immediately.',
    'Crowd is building — activate overflow protocol.',
    'Emergency services have been dispatched.',
    'Evacuate the zone in a calm and orderly manner.',
    'Restrict entry to this zone immediately.',
  ]

  if (loading) {
    return (
      <div className="virtus-layout">
        <ManagerSidebar />
        <main className="virtus-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner spinner-lg" />
        </main>
      </div>
    )
  }

  return (
    <div className="virtus-layout">
      <ManagerSidebar />
      <main className="virtus-main">
        <header className="virtus-header">
          <span style={{ fontWeight: 600 }}>{activeEvent?.name ?? t('mgrNoEvent')} — {t('mgrCommsHeader')}</span>
          {activeEvent?.status === 'ACTIVE' && (
            <span className="live-indicator" style={{ marginLeft: '8px' }}><span className="live-indicator__dot" /> {t('live')}</span>
          )}
        </header>

        {!activeEvent ? (
          <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
            <Radio size={48} style={{ margin: '0 auto 16px' }} />
            <p className="v-text-sm">{t('mgrStartEventFromDashboard')}</p>
          </div>
        ) : (
          <>
            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <button
                onClick={() => setActiveView('compose')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '14px', transition: 'all 0.2s',
                  background: activeView === 'compose' ? 'var(--v-orange)' : 'var(--v-bg-dark)',
                  color: activeView === 'compose' ? '#000' : 'var(--v-text-main)',
                }}
              >
                <MessageCircle size={16} /> {t('mgrCompose')}
              </button>
              <button
                onClick={() => setActiveView('inbox')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '14px', transition: 'all 0.2s',
                  background: activeView === 'inbox' ? 'var(--v-orange)' : 'var(--v-bg-dark)',
                  color: activeView === 'inbox' ? '#000' : 'var(--v-text-main)',
                }}
              >
                <Inbox size={16} /> {t('mgrInbox')}
                {stewardUpdates.length > 0 && (
                  <span style={{
                    background: activeView === 'inbox' ? 'rgba(0,0,0,0.3)' : 'var(--v-orange)',
                    color: activeView === 'inbox' ? '#000' : '#000',
                    borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700
                  }}>
                    {stewardUpdates.length}
                  </span>
                )}
              </button>
            </div>

            {/* COMPOSE VIEW */}
            {activeView === 'compose' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
                {/* Left Column: Compose Panels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Broadcast Message Panel */}
                  <div className="v-card">
                    <h3 className="v-text-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Radio size={18} color="var(--v-orange)" /> {t('mgrBroadcast')}
                    </h3>

                    <form onSubmit={handleBroadcastSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label className="v-text-sm mb-2 block">{t('mgrSendTo')}</label>
                        <select
                          value={broadcastZone}
                          onChange={e => setBroadcastZone(e.target.value)}
                          style={{ width: '100%', background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', color: 'var(--v-text-main)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px' }}
                        >
                          <option value="all">📣 {t('mgrAllZones')} ({t('mgrBroadcast')})</option>
                          <optgroup label="Specific Zones">
                            {zones.map(z => (
                              <option key={z.id} value={z.id}>📍 Zone {z.label}{z.name ? ` - ${z.name}` : ''}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      <div>
                        <label className="v-text-sm mb-2 block">Message</label>
                        <textarea
                          value={broadcastMessage}
                          onChange={e => setBroadcastMessage(e.target.value)}
                          placeholder="Type your broadcast instruction..."
                          required
                          rows={3}
                          style={{ width: '100%', background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', color: 'var(--v-text-main)', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      </div>

                      <button type="submit" disabled={broadcastSending || !broadcastMessage.trim()} style={{ background: broadcastSent ? '#4dff4d' : 'var(--v-orange)', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.3s' }}>
                        {broadcastSent ? '✓ ' + t('mgrSent') : broadcastSending ? t('loading') : <><Send size={16} /> {t('mgrBroadcast')}</>}
                      </button>
                    </form>
                  </div>

                  {/* Personal Message Panel */}
                  <div className="v-card">
                    <h3 className="v-text-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={18} color="var(--v-orange)" /> {t('mgrPersonalMsg')}
                    </h3>

                    <form onSubmit={handlePersonalSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label className="v-text-sm mb-2 block">Select Coordinator</label>
                        <select
                          value={personalStaff}
                          onChange={e => setPersonalStaff(e.target.value)}
                          required
                          style={{ width: '100%', background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', color: 'var(--v-text-main)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px' }}
                        >
                          {staff.length === 0 && <option value="">No active coordinators</option>}
                          {staff.map(s => {
                            const sZone = zones.find(z => z.id === s.zone_id)
                            return (
                              <option key={s.id} value={s.id}>
                                👤 {s.display_name || 'Coordinator'} {sZone ? `(Zone ${sZone.label})` : '(No Zone)'}
                              </option>
                            )
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="v-text-sm mb-2 block">Message</label>
                        <textarea
                          value={personalMessage}
                          onChange={e => setPersonalMessage(e.target.value)}
                          placeholder="Type personal message..."
                          required
                          rows={3}
                          style={{ width: '100%', background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', color: 'var(--v-text-main)', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      </div>

                      <button type="submit" disabled={personalSending || !personalMessage.trim() || !personalStaff} style={{ background: personalSent ? '#4dff4d' : 'var(--v-orange)', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.3s' }}>
                        {personalSent ? '✓ ' + t('mgrSent') : personalSending ? t('loading') : <><Send size={16} /> {t('mgrPersonalMsg')}</>}
                      </button>
                    </form>
                  </div>

                </div>

                {/* Right Panel: Quick Messages + Staff */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Quick Phrases */}
                  <div className="v-card">
                    <h3 className="v-text-title mb-3" style={{ fontSize: '14px' }}>⚡ {t('mgrQuickPhrases')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {quickMessages.map(q => (
                        <button key={q} onClick={() => setBroadcastMessage(q)} style={{ background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', color: 'var(--v-text-main)', borderRadius: '10px', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: '12px', lineHeight: 1.4, transition: 'border-color 0.2s' }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Coordinators */}
                  <div className="v-card">
                    <h3 className="v-text-title mb-3" style={{ fontSize: '14px' }}>👥 {t('mgrActiveCoordinators')} ({staff.filter(s => s.is_online).length})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {staff.filter(s => s.is_online).length === 0 && (
                        <p className="v-text-sm" style={{ opacity: 0.4 }}>No coordinators online</p>
                      )}
                      {staff.filter(s => s.is_online).map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'var(--v-bg-dark)', borderRadius: '8px' }}>
                          <div className="v-avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                            {(s.display_name || 'S').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{s.display_name || 'Staff'}</div>
                            <div style={{ fontSize: '11px', opacity: 0.5 }}>{s.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INBOX VIEW */}
            {activeView === 'inbox' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '760px' }}>
                <div className="v-card" style={{ padding: '16px 20px' }}>
                  <h3 className="v-text-title mb-1" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                    <Inbox size={16} color="var(--v-orange)" /> {t('mgrMessagesFromCoords')}
                  </h3>
                  <p className="v-text-sm" style={{ opacity: 0.5, marginBottom: 0 }}>
                    Showing latest {Math.min(stewardUpdates.length, 50)} field reports
                  </p>
                </div>

                {stewardUpdates.length === 0 ? (
                  <div className="v-card" style={{ textAlign: 'center', padding: '48px 20px', opacity: 0.5 }}>
                    <Inbox size={40} style={{ margin: '0 auto 12px' }} />
                    <p className="v-text-sm">{t('noAlerts')}</p>
                  </div>
                ) : (
                  stewardUpdates.map(update => {
                    const sender = staff.find(st => st.id === update.staff_id)
                    const zone = zones.find(z => z.id === update.zone_id)
                    const statusColor = update.status === 'EMERGENCY'
                      ? '#ff4d4d' : update.status === 'CROWD_BUILDING'
                      ? '#ffaa00' : '#4dff4d'
                    const statusLabel = update.status === 'ALL_CLEAR' ? '✅ All Clear'
                      : update.status === 'CROWD_BUILDING' ? '⚠️ Crowd Building'
                      : update.status === 'EMERGENCY' ? '🚨 EMERGENCY' : String(update.status).replace('_', ' ')

                    return (
                      <div
                        key={update.id}
                        className="v-card"
                        style={{
                          padding: '16px 20px',
                          borderLeft: `3px solid ${statusColor}`,
                          display: 'flex',
                          gap: '14px',
                          alignItems: 'flex-start',
                        }}
                      >
                        {/* Avatar */}
                        <div className="v-avatar" style={{ width: '38px', height: '38px', fontSize: '13px', flexShrink: 0 }}>
                          {(sender?.display_name || 'S').substring(0, 2).toUpperCase()}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '14px' }}>
                                {sender?.display_name || 'Unknown Coordinator'}
                              </span>
                              {zone && (
                                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.07)', padding: '2px 8px', borderRadius: '6px', color: 'var(--v-text-muted)' }}>
                                  Zone {zone.label}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--v-text-muted)' }}>
                              {new Date(update.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: statusColor }}>
                              {statusLabel}
                            </span>
                            {update.message && (
                              <span style={{ fontSize: '13px', color: 'var(--v-text-main)', opacity: 0.85 }}>
                                — {update.message}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Reply */}
                        <button
                          onClick={() => {
                            setPersonalStaff(update.staff_id)
                            setActiveView('compose')
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--v-border)',
                            color: 'var(--v-text-main)', borderRadius: '8px', padding: '6px 12px',
                            fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
                          }}
                        >
                          {t('mgrReply')}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

