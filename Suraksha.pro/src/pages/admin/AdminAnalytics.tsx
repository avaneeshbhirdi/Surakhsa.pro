import { useAdminPanelStore } from '@/stores/adminPanelStore'

export default function AdminAnalytics() {
  const { analytics, loadAnalytics } = useAdminPanelStore()

  return (
    <div>
      <div className="flex flex-between mb-6">
        <h1 className="admin-page-title" style={{ marginBottom: 0 }}>System Analytics</h1>
        <button className="btn btn-outline btn-sm" onClick={loadAnalytics}>Refresh Data</button>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Users</div>
          <div className="admin-stat-card__value">{analytics.totalUsers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Events</div>
          <div className="admin-stat-card__value">{analytics.totalEvents}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Alerts Generated</div>
          <div className="admin-stat-card__value">{analytics.totalAlerts}</div>
        </div>
      </div>

      <div className="admin-stat-card" style={{ marginTop: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)', color: '#fff' }}>Platform Health</h2>
        <div style={{ padding: 'var(--space-4)', background: '#111', borderRadius: 'var(--radius-md)', border: '1px solid #333' }}>
          <p className="text-secondary mb-2">Supabase Realtime Connection: <span style={{ color: 'var(--color-safe)' }}>Healthy</span></p>
          <p className="text-secondary mb-2">Database Storage: <span style={{ color: 'var(--color-safe)' }}>Normal</span></p>
          <p className="text-secondary">Edge Functions: <span style={{ color: 'var(--color-safe)' }}>Operational</span></p>
        </div>
      </div>
    </div>
  )
}
