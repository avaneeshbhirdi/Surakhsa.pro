import { useState, useEffect } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import { Send, Radio, User } from 'lucide-react'

export default function ManagerComms() {
  const { profile } = useAuthStore()
  const { activeEvent, zones, staff, loadEvent, sendInstruction } = useEventStore()
  const [loading, setLoading] = useState(true)

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
    const loadActiveEvent = async () => {
      if (!profile) { setLoading(false); return }
      if (activeEvent) { setLoading(false); return }
      const { data: events } = await supabase
        .from('events').select('*')
        .eq('admin_id', profile.id)
        .in('status', ['ACTIVE', 'PAUSED', 'DRAFT'])
        .order('created_at', { ascending: false }).limit(1)
      if (events && events.length > 0) await loadEvent(events[0].id)
      setLoading(false)
    }
    loadActiveEvent()
  }, [profile])

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
          <span style={{ fontWeight: 600 }}>{activeEvent?.name ?? 'No Event'} — Comms</span>
          {activeEvent?.status === 'ACTIVE' && (
            <span className="live-indicator" style={{ marginLeft: '8px' }}><span className="live-indicator__dot" /> LIVE</span>
          )}
        </header>

        {!activeEvent ? (
          <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
            <Radio size={48} style={{ margin: '0 auto 16px' }} />
            <p className="v-text-sm">No active event. Start an event to use Comms.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
            {/* Left Column: Compose Panels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Broadcast Message Panel */}
              <div className="v-card">
                <h3 className="v-text-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Radio size={18} color="var(--v-orange)" /> Broadcast Message
                </h3>

                <form onSubmit={handleBroadcastSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="v-text-sm mb-2 block">Send To</label>
                    <select
                      value={broadcastZone}
                      onChange={e => setBroadcastZone(e.target.value)}
                      style={{ width: '100%', background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', color: 'var(--v-text-main)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px' }}
                    >
                      <option value="all">📣 All Zones (Global Broadcast)</option>
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
                    {broadcastSent ? '✓ Sent!' : broadcastSending ? 'Sending...' : <><Send size={16} /> Send Broadcast</>}
                  </button>
                </form>
              </div>

              {/* Personal Message Panel */}
              <div className="v-card">
                <h3 className="v-text-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="var(--v-orange)" /> Personal Message
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
                    {personalSent ? '✓ Sent!' : personalSending ? 'Sending...' : <><Send size={16} /> Send Personal Message</>}
                  </button>
                </form>
              </div>

            </div>

            {/* Right Panel: Quick Messages + Staff */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Quick Phrases */}
              <div className="v-card">
                <h3 className="v-text-title mb-3" style={{ fontSize: '14px' }}>⚡ Quick Phrases</h3>
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
                <h3 className="v-text-title mb-3" style={{ fontSize: '14px' }}>👥 Active Coordinators ({staff.filter(s => s.is_online).length})</h3>
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
      </main>
    </div>
  )
}
