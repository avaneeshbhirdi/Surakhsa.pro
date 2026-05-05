import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'
import { Calendar, MapPin, Users, AlertTriangle } from 'lucide-react'
import ManagerSidebar from '@/components/ManagerSidebar'

export default function EventHistory() {
  const navigate = useNavigate()
  const { profile, role } = useAuthStore()
  const [events, setEvents] = useState<(Event & { zones_count?: number; alerts_count?: number })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadEvents()
  }, [profile])

  const loadEvents = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('admin_id', profile.id)
      .order('created_at', { ascending: false })

    if (data) {
      // Load counts for each event
      const enriched = await Promise.all(
        data.map(async (evt) => {
          const [zonesRes, alertsRes] = await Promise.all([
            supabase.from('zones').select('id', { count: 'exact', head: true }).eq('event_id', evt.id),
            supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('event_id', evt.id),
          ])
          return { ...evt, zones_count: zonesRes.count || 0, alerts_count: alertsRes.count || 0 }
        })
      )
      setEvents(enriched)
    }
    setLoading(false)
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'badge-info',
      ACTIVE: 'badge-safe',
      PAUSED: 'badge-warning',
      ENDED: 'badge-danger',
    }
    return map[status] || 'badge-info'
  }

  return (
    <div className="virtus-layout">
      <ManagerSidebar />
      <main className="virtus-main">
        <header className="virtus-header">
          <span style={{ fontWeight: 600 }}>Event History</span>
          <button className="virtus-pill" onClick={() => navigate('/event/create')} style={{ color: 'var(--v-orange)', borderColor: 'var(--v-orange)' }}>
            + New Event
          </button>
        </header>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
            <Calendar size={48} style={{ margin: '0 auto 16px' }} />
            <p className="v-text-sm">No events yet.</p>
            <button className="btn mt-4" style={{ background: 'var(--v-orange)', color: '#fff', border: 'none' }} onClick={() => navigate('/event/create')}>Create Your First Event</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {events.map(evt => (
              <div
                key={evt.id}
                className="v-card"
                style={{ 
                  cursor: (evt.status === 'ACTIVE' || evt.status === 'PAUSED' || evt.status === 'DRAFT') ? 'pointer' : 'default',
                  transition: 'transform 0.2s, border-color 0.2s',
                  border: '1px solid var(--v-border)'
                }}
                onClick={() => (evt.status === 'ACTIVE' || evt.status === 'PAUSED' || evt.status === 'DRAFT') && navigate(role === 'ADMIN' ? '/dashboard' : '/manager')}
                onMouseEnter={(e) => {
                  if (evt.status === 'ACTIVE' || evt.status === 'PAUSED' || evt.status === 'DRAFT') {
                    e.currentTarget.style.borderColor = 'var(--v-orange)'
                  }
                }}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--v-border)'}
              >
                <div className="flex flex-between mb-4">
                  <h3 className="v-text-title" style={{ margin: 0 }}>
                    {evt.name}
                  </h3>
                  <span style={{ 
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', 
                    background: evt.status === 'ACTIVE' ? '#4dff4d20' : evt.status === 'DRAFT' ? '#3b82f620' : evt.status === 'PAUSED' ? '#facc1520' : '#ff4d4d20', 
                    color: evt.status === 'ACTIVE' ? '#4dff4d' : evt.status === 'DRAFT' ? '#60a5fa' : evt.status === 'PAUSED' ? '#facc15' : '#ff4d4d' 
                  }}>
                    {evt.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {evt.venue_name && (
                    <span className="v-text-sm flex" style={{ alignItems: 'center', gap: '6px', opacity: 0.7 }}>
                      <MapPin size={14} /> {evt.venue_name}
                    </span>
                  )}
                  {evt.event_date && (
                    <span className="v-text-sm flex" style={{ alignItems: 'center', gap: '6px', opacity: 0.7 }}>
                      <Calendar size={14} /> {new Date(evt.event_date).toLocaleDateString()}
                    </span>
                  )}
                  <span className="v-text-sm flex" style={{ alignItems: 'center', gap: '6px', opacity: 0.7 }}>
                    <Users size={14} /> {evt.zones_count} zones
                  </span>
                  <span className="v-text-sm flex" style={{ alignItems: 'center', gap: '6px', opacity: 0.7 }}>
                    <AlertTriangle size={14} /> {evt.alerts_count} alerts
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--v-border)', opacity: 0.5, fontSize: '12px' }}>
                  <span>PIN: {evt.pin}</span>
                  <span>Created: {new Date(evt.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
