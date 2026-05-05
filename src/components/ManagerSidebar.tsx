import { Home, Calendar, Target, Folder, MessageSquare, Bell, Settings, LogOut, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEventStore } from '@/stores/eventStore'
import { useUIStore } from '@/stores/uiStore'

export default function ManagerSidebar() {
  const { logout, profile } = useAuthStore()
  const { alerts } = useEventStore()
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()

  const activeAlerts = alerts.filter(a => a.status === 'TRIGGERED').length

  const navItems = [
    { icon: <Home size={18} />, label: 'Home', path: '/manager' },
    { icon: <Calendar size={18} />, label: 'History', path: '/event/history' },
    { icon: <Target size={18} />, label: 'Map', path: '/manager/map' },
    { icon: <MapPin size={18} />, label: 'Zones', path: '/manager/zones' },
    { icon: <Folder size={18} />, label: 'Analytics', path: '/manager/analytics' },
    { icon: <MessageSquare size={18} />, label: 'Comms', path: '/manager/comms' },
  ]

  const bottomItems = [
    { icon: <Bell size={18} />, label: 'Alerts', path: '/manager/alerts', badge: activeAlerts > 0 ? activeAlerts : null },
    { icon: <Settings size={18} />, label: 'Settings', path: '/manager/settings' },
  ]

  const isActive = (path: string) => {
    if (path === '/manager') return location.pathname === '/manager'
    return location.pathname.startsWith(path)
  }

  return (
    <aside className={`virtus-sidebar ${isSidebarCollapsed ? 'virtus-sidebar--collapsed' : ''}`}>
      <div className="virtus-sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div className="virtus-logo-container" onClick={() => navigate('/')} style={{ cursor: 'pointer', margin: 0 }}>
          <img src="/main logo-png.png" alt="Logo" style={{ height: '24px', marginRight: isSidebarCollapsed ? '0' : '8px' }} />
          {!isSidebarCollapsed && <span className="virtus-logo-text">Suraksha<span style={{ color: 'var(--v-orange)' }}>.pro</span></span>}
        </div>
        <button onClick={toggleSidebar} style={{ background: 'transparent', border: 'none', color: 'var(--v-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>


      <nav className="virtus-nav">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`virtus-nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon} {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
          </button>
        ))}

        <div className="virtus-nav-divider" />

        {bottomItems.map(item => (
          <button
            key={item.path}
            className={`virtus-nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon} {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
            {item.badge && !isSidebarCollapsed && (
              <span className="virtus-badge" style={{ background: '#ff4d4d', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: 700 }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="virtus-sidebar-footer">
        <div className="virtus-profile-preview" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
          <div className="v-avatar" style={{ width: '32px', height: '32px', fontSize: '12px', flexShrink: 0 }}>
            {(profile?.full_name || 'M').substring(0, 2).toUpperCase()}
          </div>
          {!isSidebarCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div className="v-text-sm" style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {profile?.full_name || 'Manager'}
              </div>
              <div className="v-text-xs" style={{ opacity: 0.5 }}>{profile?.role?.replace('_', ' ') || 'Event Manager'}</div>
            </div>
          )}
        </div>
        <button className="virtus-nav-item logout" onClick={() => logout()}>
          <LogOut size={18} /> {!isSidebarCollapsed && 'Logout'}
        </button>
      </div>
    </aside>
  )
}
