import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import { supabase } from '@/lib/supabase'
import { Mic, MicOff } from 'lucide-react'
import RealtimeStatus from '@/components/RealtimeStatus'

export default function StewardApp() {
  const { pinSession, logout } = useAuthStore()
  const { activeEvent, loadEvent, instructions, zones, staff } = useEventStore()
  const [isPTTActive, setIsPTTActive] = useState(false)

  const eventId = pinSession?.eventId || ''
  const zoneId = pinSession?.zoneId || ''

  useEffect(() => {
    if (eventId) loadEvent(eventId)
  }, [eventId])

  // AUTO-LOGOUT: If manager removes this steward, logout immediately
  useEffect(() => {
    if (!pinSession?.staffId || staff.length === 0) return
    
    const stillActive = staff.some(s => s.id === pinSession.staffId)
    if (!stillActive) {
      console.log('Steward removed by manager. Logging out...')
      logout()
    }
  }, [staff, pinSession?.staffId, logout])

  const myZone = zones.find(z => z.id === zoneId)

  const handleReport = async (status: 'ALL_CLEAR' | 'CROWD_BUILDING' | 'EMERGENCY') => {
    if (!pinSession) return
    await supabase.from('steward_updates').insert({
      event_id: eventId,
      zone_id: zoneId || null,
      staff_id: pinSession.staffId,
      status,
    })
  }

  // Filter instructions applicable to this steward, sort descending to get latest
  const myInstructions = instructions
    .filter(i => i.is_broadcast || i.zone_id === zoneId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  const latestInstruction = myInstructions[0]

  return (
    <div className="page" style={{ background: '#000', position: 'relative' }}>
      
      {/* Top Section */}
      <div style={{ padding: 'var(--space-6)', background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--color-gold)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-extrabold)', margin: 0, lineHeight: 1 }}>
            Zone {myZone?.label || '?'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-lg)', marginTop: 'var(--space-2)' }}>
            {activeEvent?.name || 'Loading Event...'}
          </p>
        </div>
        <RealtimeStatus />
      </div>

      <div className="flex-1 flex-col" style={{ display: 'flex', padding: 'var(--space-4)' }}>
        
        {/* Center: Instruction Card */}
        <div className="card-glass" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)', minHeight: '120px', flex: '0 1 auto', overflowY: 'auto' }}>
          <h3 className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>LATEST INSTRUCTION</h3>
          {latestInstruction ? (
            <p style={{ fontSize: '18px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
              {latestInstruction.message}
            </p>
          ) : (
            <p style={{ fontSize: '18px', color: 'var(--color-text-muted)' }}>No instructions yet.</p>
          )}
        </div>

        {/* Bottom: Three Status Buttons */}
        <div className="flex-1 flex-col gap-4" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-24)' }}>
          <button className="steward-status-btn steward-status-btn--clear" onClick={() => handleReport('ALL_CLEAR')} style={{ height: '72px', fontSize: 'var(--text-xl)' }}>
            🟢 ALL CLEAR
          </button>
          
          <button className="steward-status-btn steward-status-btn--building" onClick={() => handleReport('CROWD_BUILDING')} style={{ height: '72px', fontSize: 'var(--text-xl)' }}>
            🟡 CROWD BUILDING
          </button>
          
          <button className="steward-status-btn steward-status-btn--emergency" onClick={() => handleReport('EMERGENCY')} style={{ height: '72px', fontSize: 'var(--text-xl)' }}>
            🔴 EMERGENCY
          </button>
        </div>
      </div>

      {/* FAB: PTT Button */}
      <button
        className={`ptt-button ${isPTTActive ? 'ptt-button--transmitting' : ''}`}
        style={{ 
          position: 'fixed', 
          bottom: 'var(--space-6)', 
          right: 'var(--space-6)', 
          width: '80px', 
          height: '80px', 
          borderWidth: '2px',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 1000
        }}
        onMouseDown={() => setIsPTTActive(true)}
        onMouseUp={() => setIsPTTActive(false)}
        onTouchStart={() => setIsPTTActive(true)}
        onTouchEnd={() => setIsPTTActive(false)}
      >
        {isPTTActive ? <MicOff size={32} /> : <Mic size={32} className="text-gold" />}
      </button>

    </div>
  )
}
