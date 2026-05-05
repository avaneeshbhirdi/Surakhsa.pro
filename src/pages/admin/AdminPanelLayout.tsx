import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAdminPanelStore } from '@/stores/adminPanelStore'
import { LayoutDashboard, Users, Calendar, BarChart3, LogOut } from 'lucide-react'

export default function AdminPanelLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, adminEmail } = useAdminPanelStore()

  const handleLogout = () => {
    logout()
    navigate('/1234/admin')
  }

  const navItems = [
    { path: '/1234/admin/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { path: '/1234/admin/users', icon: <Users size={16} />, label: 'Users' },
    { path: '/1234/admin/events', icon: <Calendar size={16} />, label: 'Events' },
    { path: '/1234/admin/analytics', icon: <BarChart3 size={16} />, label: 'Analytics' },
  ]

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__title">
          <img 
            src="/main logo-png.png" 
            alt="Suraksha" 
            style={{ height: '40px', width: 'auto', marginBottom: '12px' }}
          />
          <div style={{ fontSize: '1.2rem', color: 'var(--color-gold)' }}>Suraksha Admin</div>
          <div style={{ fontSize: 'var(--text-xs)', color: '#888', fontWeight: 'normal', marginTop: '4px' }}>
            {adminEmail}
          </div>
        </div>

        <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {navItems.map(item => (
            <button
              key={item.path}
              className={`admin-sidebar__link ${location.pathname === item.path ? 'admin-sidebar__link--active' : ''}`}
              onClick={() => navigate(item.path)}
              style={{ width: '100%', textAlign: 'left', border: 'none' }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        <button className="admin-sidebar__link" onClick={handleLogout} style={{ border: 'none', width: '100%', textAlign: 'left', marginTop: 'auto' }}>
          <LogOut size={16} /> Logout
        </button>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  )
}
