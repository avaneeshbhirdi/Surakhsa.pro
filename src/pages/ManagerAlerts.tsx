import { useState, useEffect } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import { Bell, CheckCircle, AlertTriangle } from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#ff4d4d',
  HIGH: 'orange',
  MEDIUM: '#facc15',
  LOW: 'var(--v-orange)',
}

const STATUS_COLOR: Record<string, string> = {
  TRIGGERED: '#ff4d4d',
  ACKNOWLEDGED: 'orange',
  RESOLVED: '#4dff4d',
}

export default function ManagerAlerts() {
  const { profile } = useAuthStore()
  const { activeEvent, alerts, zones, loadEvent, acknowledgeAlert, resolveAlert } = useEventStore()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL')

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

  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => a.status === filter)
  const triggered = alerts.filter(a => a.status === 'TRIGGERED').length
  const acknowledged = alerts.filter(a => a.status === 'ACKNOWLEDGED').length
  const resolved = alerts.filter(a => a.status === 'RESOLVED').length

  const getZoneName = (id: string | null) => {
    if (!id) return 'General'
    const z = zones.find(z => z.id === id)
    return z ? `Zone ${z.label}${z.name ? ` - ${z.name}` : ''}` : 'Unknown'
  }

  return (
    <div className="virtus-layout">
      <ManagerSidebar />
      <main className="virtus-main">
        <header className="virtus-header">
          <span style={{ fontWeight: 600 }}>{activeEvent?.name ?? t('mgrNoEvent')} — {t('mgrActiveAlerts')}</span>
          {triggered > 0 && (
            <span style={{ background: '#ff4d4d20', color: '#ff4d4d', border: '1px solid #ff4d4d50', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
              {triggered} {t('live')}
            </span>
          )}
        </header>

        {/* Summary pills */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {([
            { key: 'ALL', label: 'All', count: alerts.length },
            { key: 'TRIGGERED', label: '🔴 Triggered', count: triggered },
            { key: 'ACKNOWLEDGED', label: '🟡 Acknowledged', count: acknowledged },
            { key: 'RESOLVED', label: '🟢 Resolved', count: resolved },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: filter === f.key ? 'var(--v-orange)' : 'var(--v-bg-dark)',
                color: filter === f.key ? '#000' : 'var(--v-text-main)',
                border: filter === f.key ? 'none' : '1px solid var(--v-border)',
              }}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Alert List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', opacity: 0.4, border: '1px dashed var(--v-border)', borderRadius: '20px' }}>
              <Bell size={40} style={{ margin: '0 auto 12px' }} />
              <p className="v-text-sm">{t('noAlerts')}</p>
            </div>
          )}

          {filtered.map(a => (
            <div key={a.id} style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', padding: '16px 20px',
              background: 'var(--v-bg-dark)', border: `1px solid ${PRIORITY_COLOR[a.priority] || 'var(--v-border)'}40`,
              borderLeft: `4px solid ${PRIORITY_COLOR[a.priority] || 'var(--v-border)'}`,
              borderRadius: '12px', alignItems: 'center',
            }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: `${PRIORITY_COLOR[a.priority] || 'gray'}25`, color: PRIORITY_COLOR[a.priority] || 'gray' }}>
                    {a.priority}
                  </span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)' }}>{a.risk_type}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: `${STATUS_COLOR[a.status] || 'gray'}20`, color: STATUS_COLOR[a.status] || 'gray' }}>
                    {a.status}
                  </span>
                  <span style={{ fontSize: '11px', opacity: 0.5 }}>{getZoneName(a.zone_id)}</span>
                  <span style={{ fontSize: '11px', opacity: 0.4 }}>
                    {new Date(a.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="v-text-sm" style={{ margin: 0 }}>{a.message}</p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {a.status === 'TRIGGERED' && (
                  <button
                    onClick={() => profile && acknowledgeAlert(a.id, profile.id)}
                    title="Acknowledge"
                    style={{ background: 'orange20', border: '1px solid orange', color: 'orange', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    ACK
                  </button>
                )}
                {(a.status === 'TRIGGERED' || a.status === 'ACKNOWLEDGED') && (
                  <button
                    onClick={() => resolveAlert(a.id)}
                    title="Resolve"
                    style={{ background: '#4dff4d20', border: '1px solid #4dff4d', color: '#4dff4d', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    <CheckCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {t('resolve')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
