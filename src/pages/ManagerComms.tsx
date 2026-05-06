import { useState, useEffect } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import { Send, Radio } from 'lucide-react'

export default function ManagerComms() {
  const { profile } = useAuthStore()
  const { activeEvent, zones, staff, loadEvent, sendInstruction } = useEventStore()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedZone, setSelectedZone] = useState<string | 'all'>('all')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !activeEvent || !profile) return
    setSending(true)
    try {
      let zoneId: string | null = null
      let isBroadcast = false
      let finalMessage = message.trim()

      if (selectedZone === 'all') {
        isBroadcast = true
      } else if (selectedZone.startsWith('staff_')) {
        const staffId = selectedZone.replace('staff_', '')
        const targetStaff = staff.find(s => s.id === staffId)
        zoneId = targetStaff?.zone_id || null
        if (!zoneId) isBroadcast = true // fallback to broadcast if they have no zone
        finalMessage = `[Direct: ${targetStaff?.display_name || 'Coordinator'}] ${message.trim()}`
      } else {
        zoneId = selectedZone
      }

      await sendInstruction(activeEvent.id, zoneId, profile.id, finalMessage, isBroadcast)
      setSent(true)
      setMessage('')
      setTimeout(() => setSent(false), 2000)
    } catch (err: any) {
      alert(err.message || 'Failed to send')
    } finally {
      setSending(false)
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
            {/* Compose Panel */}
            <div className="v-card">
              <h3 className="v-text-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} color="var(--v-orange)" /> Broadcast Message
              </h3>

              <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Target selector */}
                <div>
                  <label className="v-text-sm mb-2 block">Send To</label>
                  <select
                    value={selectedZone}
                    onChange={e => setSelectedZone(e.target.value)}
                    style={{ width: '100%', background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', color: 'var(--v-text-main)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px' }}
                  >
                    <optgroup label="Broadcast">
                      <option value="all">📣 All Coordinators (Broadcast)</option>
                    </optgroup>
                    <optgroup label="Specific Zones">
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>📍 Zone {z.label}{z.name ? ` - ${z.name}` : ''}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Personal Message (Coordinators)">
                      {staff.map(s => (
                        <option key={`staff_${s.id}`} value={`staff_${s.id}`}>👤 {s.display_name || 'Coordinator'}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Message box */}
                <div>
                  <label className="v-text-sm mb-2 block">Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Type your instruction..."
                    required
                    rows={5}
                    style={{ width: '100%', background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', color: 'var(--v-text-main)', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>

                <button type="submit" disabled={sending || !message.trim()} style={{ background: sent ? '#4dff4d' : 'var(--v-orange)', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.3s' }}>
                  {sent ? '✓ Sent!' : sending ? 'Sending...' : <><Send size={16} /> Send Instruction</>}
                </button>
              </form>
            </div>

            {/* Right Panel: Quick Messages + Staff */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Quick Phrases */}
              <div className="v-card">
                <h3 className="v-text-title mb-3" style={{ fontSize: '14px' }}>⚡ Quick Phrases</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {quickMessages.map(q => (
                    <button key={q} onClick={() => setMessage(q)} style={{ background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)', color: 'var(--v-text-main)', borderRadius: '10px', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: '12px', lineHeight: 1.4, transition: 'border-color 0.2s' }}>
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
