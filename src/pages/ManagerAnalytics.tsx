import { useState, useEffect, useMemo } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { TrendingUp, AlertTriangle, Users, Shield } from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'
import RealtimeStatus from '@/components/RealtimeStatus'

export default function ManagerAnalytics() {
  const { profile } = useAuthStore()
  const { activeEvent, zones, alerts, latestReadings, loadEvent } = useEventStore()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)

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

  const zoneData = useMemo(() => zones.map(z => {
    const r = latestReadings[z.id]
    const pct = z.capacity > 0 ? Math.min(100, Math.round(((r?.density || 0) / z.capacity) * 100)) : 0
    return { name: z.label, density: pct, people: r?.density || 0 }
  }), [zones, latestReadings])

  const alertsByType = useMemo(() => {
    const map: Record<string, number> = {}
    alerts.forEach(a => { map[a.risk_type] = (map[a.risk_type] || 0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [alerts])

  const totalPeople = Object.values(latestReadings).reduce((acc, r) => acc + (r.density || 0), 0)
  const totalCapacity = zones.reduce((acc, z) => acc + z.capacity, 0)
  const overallPct = totalCapacity > 0 ? Math.round((totalPeople / totalCapacity) * 100) : 0
  const activeAlerts = alerts.filter(a => a.status === 'TRIGGERED').length
  const resolvedAlerts = alerts.filter(a => a.status === 'RESOLVED').length

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

  const statCards = [
    { icon: <Users size={20} />, label: t('mgrTotalCrowd'), value: totalPeople, sub: `of ${totalCapacity} capacity`, color: 'var(--v-orange)' },
    { icon: <TrendingUp size={20} />, label: t('mgrPeakDensity'), value: `${overallPct}%`, sub: 'across all zones', color: overallPct > 80 ? '#ff4d4d' : overallPct > 60 ? 'orange' : '#4dff4d' },
    { icon: <AlertTriangle size={20} />, label: t('mgrActiveAlerts'), value: activeAlerts, sub: `${resolvedAlerts} resolved`, color: activeAlerts > 0 ? '#ff4d4d' : '#4dff4d' },
    { icon: <Shield size={20} />, label: t('mgrZonesHeader'), value: zones.length, sub: `${zones.filter(z => { const r = latestReadings[z.id]; const p = z.capacity > 0 ? ((r?.density || 0) / z.capacity) * 100 : 0; return p > 80 }).length} at risk`, color: 'var(--v-orange)' },
  ]

  return (
    <div className="virtus-layout">
      <ManagerSidebar />
      <main className="virtus-main">
        <header className="virtus-header">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>{activeEvent?.name ?? t('mgrNoEvent')} — {t('mgrAnalyticsHeader')}</span>
            {activeEvent?.status === 'ACTIVE' && (
              <span className="live-indicator" style={{ marginLeft: '8px' }}><span className="live-indicator__dot" /> {t('live')}</span>
            )}
          </div>
          <RealtimeStatus />
        </header>

        {/* Stat Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {statCards.map(s => (
            <div key={s.label} className="v-card" style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{s.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div className="v-text-sm" style={{ fontWeight: 600 }}>{s.label}</div>
              <div className="v-text-sm" style={{ opacity: 0.5 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="v-card">
            <h3 className="v-text-title mb-4">{t('mgrRoomDensity')} (%)</h3>
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={{ background: 'var(--v-card-bg)', border: '1px solid var(--v-border)', borderRadius: '8px' }} formatter={(v) => [`${v}%`, 'Density']} />
                  <Bar dataKey="density" fill="var(--v-orange)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="v-card">
            {alertsByType.length === 0 ? (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
                <p className="v-text-sm">{t('noAlerts')}</p>
              </div>
            ) : (
              <div style={{ height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertsByType} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--v-card-bg)', border: '1px solid var(--v-border)', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#ff4d4d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Alert Timeline */}
        <div className="v-card" style={{ marginTop: '20px' }}>
          <h3 className="v-text-title mb-4">{t('mgrTotalAlerts')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
            {alerts.length === 0 && (
              <p className="v-text-sm" style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>{t('noAlerts')}</p>
            )}
            {alerts.slice(0, 20).map(a => (
              <div key={a.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '12px', background: 'var(--v-bg-dark)', borderRadius: '10px', border: '1px solid var(--v-border)' }}>
                <span style={{ fontSize: '11px', opacity: 0.5, minWidth: '60px' }}>
                  {new Date(a.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, background: a.priority === 'CRITICAL' ? '#ff4d4d30' : '#ffa50030', color: a.priority === 'CRITICAL' ? '#ff4d4d' : 'orange' }}>
                  {a.priority}
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', background: 'rgba(255,255,255,0.06)' }}>{a.risk_type}</span>
                <span className="v-text-sm" style={{ flex: 1 }}>{a.message}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: a.status === 'RESOLVED' ? '#4dff4d20' : a.status === 'TRIGGERED' ? '#ff4d4d20' : '#ffa50020', color: a.status === 'RESOLVED' ? '#4dff4d' : a.status === 'TRIGGERED' ? '#ff4d4d' : 'orange' }}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
