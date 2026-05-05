import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'
import { ArrowLeft, Calendar, MapPin, Users, AlertTriangle } from 'lucide-react'

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
    <div className="page">
      <div className="header">
        <div className="header__left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(role === 'ADMIN' ? '/dashboard' : '/manager')}>
            <ArrowLeft size={18} />
          </button>
          <h1 className="header__title">Event History</h1>
        </div>
        <button className="btn btn-gold btn-sm" onClick={() => navigate('/event/create')}>
          + New Event
        </button>
      </div>

      <div className="container p-4">
        {loading ? (
          <div className="page-centered"><div className="spinner spinner-lg" /></div>
        ) : events.length === 0 ? (
          <div className="page-centered">
            <p className="text-secondary">No events yet.</p>
            <button className="btn btn-gold mt-4" onClick={() => navigate('/event/create')}>Create Your First Event</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map(evt => (
              <div
                key={evt.id}
                className="card-glass"
                style={{ cursor: (evt.status === 'ACTIVE' || evt.status === 'PAUSED' || evt.status === 'DRAFT') ? 'pointer' : 'default', padding: 'var(--space-5)' }}
                onClick={() => (evt.status === 'ACTIVE' || evt.status === 'PAUSED' || evt.status === 'DRAFT') && navigate(role === 'ADMIN' ? '/dashboard' : '/manager')}
              >
                <div className="flex flex-between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>
                      {evt.name}
                    </h3>
                    <div className="flex gap-4" style={{ flexWrap: 'wrap', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                      {evt.venue_name && (
                        <span className="flex gap-2" style={{ alignItems: 'center' }}><MapPin size={14} /> {evt.venue_name}</span>
                      )}
                      {evt.event_date && (
                        <span className="flex gap-2" style={{ alignItems: 'center' }}><Calendar size={14} /> {new Date(evt.event_date).toLocaleDateString()}</span>
                      )}
                      <span className="flex gap-2" style={{ alignItems: 'center' }}><Users size={14} /> {evt.zones_count} zones</span>
                      <span className="flex gap-2" style={{ alignItems: 'center' }}><AlertTriangle size={14} /> {evt.alerts_count} alerts</span>
                    </div>
                  </div>
                  <span className={`badge ${getStatusBadge(evt.status)}`}>{evt.status}</span>
                </div>
                <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  PIN: {evt.pin} &bull; Created {new Date(evt.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
