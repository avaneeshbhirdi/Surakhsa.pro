import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import { MapPin, Users } from 'lucide-react'

export default function ManagerMap() {
  const { profile } = useAuthStore()
  const { activeEvent, zones, latestReadings, alerts, loadEvent } = useEventStore()
  const [loading, setLoading] = useState(true)

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

  if (!activeEvent) {
    return (
      <div className="virtus-layout">
        <ManagerSidebar />
        <main className="virtus-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <MapPin size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
            <h2 className="v-text-title">No Active Event</h2>
            <p className="v-text-sm">Start an event from the dashboard to see the map.</p>
          </div>
        </main>
      </div>
    )
  }

  const activeAlertZones = new Set(alerts.filter(a => a.status === 'TRIGGERED').map(a => a.zone_id))

  return (
    <div className="virtus-layout">
      <ManagerSidebar />
      <main className="virtus-main">
        <header className="virtus-header">
          <span style={{ fontWeight: 600 }}>{activeEvent.name} — Venue Map</span>
          {activeEvent.status === 'ACTIVE' && (
            <span className="live-indicator" style={{ marginLeft: '8px' }}><span className="live-indicator__dot" /> LIVE</span>
          )}
        </header>

        {/* Legend */}
        <div className="v-card mb-4" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="v-text-sm" style={{ fontWeight: 600 }}>Legend:</span>
          {[
            { color: '#4dff4d', label: 'Safe (< 60%)' },
            { color: 'orange', label: 'Moderate (60-80%)' },
            { color: '#ff4d4d', label: 'Critical (> 80%)' },
          ].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, display: 'inline-block' }} />
              {l.label}
            </span>
          ))}
        </div>

        {/* Zone Grid Map */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {zones.map((z, i) => {
            const reading = latestReadings[z.id]
            const density = reading?.density || 0
            const pct = z.capacity > 0 ? Math.min(100, Math.round((density / z.capacity) * 100)) : 0
            const hasAlert = activeAlertZones.has(z.id)

            let color = '#4dff4d'
            if (pct > 80) color = '#ff4d4d'
            else if (pct > 60) color = 'orange'

            return (
              <div key={z.id} style={{
                background: `${color}18`,
                border: `2px solid ${color}`,
                borderRadius: '16px',
                padding: '20px',
                position: 'relative',
                transition: 'transform 0.2s',
                cursor: 'default',
                boxShadow: hasAlert ? `0 0 16px ${color}55` : 'none',
              }}>
                {hasAlert && (
                  <span style={{
                    position: 'absolute', top: '-8px', right: '-8px',
                    background: '#ff4d4d', color: 'white', borderRadius: '50%',
                    width: '20px', height: '20px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '11px', fontWeight: 700
                  }}>!</span>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color }}>{z.label}</span>
                  <span style={{ fontSize: '11px', background: `${color}30`, color, padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                    {reading?.color_state || 'SAFE'}
                  </span>
                </div>
                {z.name && <div className="v-text-sm mb-3" style={{ opacity: 0.7 }}>{z.name}</div>}

                {/* Mini progress */}
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '6px', marginBottom: '12px' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 1s' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={13} /> {density}
                  </span>
                  <span style={{ fontWeight: 700, color }}>{pct}%</span>
                </div>
                <div className="v-text-sm" style={{ opacity: 0.5, marginTop: '4px', fontSize: '11px' }}>
                  Max: {z.capacity}
                </div>
              </div>
            )
          })}

          {zones.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', border: '1px dashed var(--v-border)', borderRadius: '20px' }}>
              <MapPin size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <p className="v-text-sm">No zones configured yet. Create zones from the Zones section.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
