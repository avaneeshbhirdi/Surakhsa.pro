import { useEffect } from 'react'
import { useAdminPanelStore } from '@/stores/adminPanelStore'

export default function AdminPanelDashboard() {
  const { analytics, loadAnalytics } = useAdminPanelStore()

  useEffect(() => {
    loadAnalytics()
  }, [])

  return (
    <div>
      <h1 className="admin-page-title">Dashboard Overview</h1>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Total Users (Admins)</div>
          <div className="admin-stat-card__value">{analytics.totalUsers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Total Events</div>
          <div className="admin-stat-card__value">{analytics.totalEvents}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Active Events</div>
          <div className="admin-stat-card__value" style={{ color: 'var(--color-safe)' }}>
            {analytics.activeEvents}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Total Alerts</div>
          <div className="admin-stat-card__value" style={{ color: 'var(--color-warning)' }}>
            {analytics.totalAlerts}
          </div>
        </div>
      </div>

      <div className="admin-stat-card" style={{ marginTop: 'var(--space-8)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)', color: '#fff' }}>Quick Actions</h2>
        <div className="flex gap-4">
          <button className="btn btn-primary" onClick={() => window.open('/', '_blank')}>View Main App</button>
          <button className="btn btn-outline" onClick={() => loadAnalytics()}>Refresh Stats</button>
        </div>
      </div>
    </div>
  )
}
