import { Shield, MessageSquare, AlertTriangle, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'

interface CoordinatorSidebarProps {
  activeTab: 'zone' | 'comms' | 'alerts'
  setActiveTab: (tab: 'zone' | 'comms' | 'alerts') => void
  unreadCount: number
}

export default function CoordinatorSidebar({ activeTab, setActiveTab, unreadCount }: CoordinatorSidebarProps) {
  const { logout, profile, pinSession } = useAuthStore()
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const navigate = useNavigate()

  const displayName = profile?.full_name || pinSession?.displayName || 'Coordinator'

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const navItems: { id: 'zone' | 'comms' | 'alerts', icon: React.ReactNode, label: string, badge?: number | null }[] = [
    { id: 'zone', icon: <Shield size={18} />, label: 'My Zone' },
    { id: 'comms', icon: <MessageSquare size={18} />, label: 'Communicate' },
    { id: 'alerts', icon: <AlertTriangle size={18} />, label: 'Alerts', badge: unreadCount > 0 ? unreadCount : null },
  ]

  return (
    <aside className={`virtus-sidebar ${isSidebarCollapsed ? 'virtus-sidebar--collapsed' : ''}`}>
      <div className="virtus-sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', marginBottom: '32px' }}>
        <div className="virtus-logo-container" onClick={() => navigate('/')} style={{ cursor: 'pointer', margin: 0 }}>
          <img src="/main logo-png.png" alt="Logo" style={{ height: '24px', marginRight: isSidebarCollapsed ? '0' : '8px' }} />
          {!isSidebarCollapsed && <span className="virtus-logo-text">Suraksha<span style={{ color: 'var(--v-orange)' }}>.pro</span></span>}
        </div>
      </div>

      <nav className="virtus-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`virtus-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon} 
            {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
            {!isSidebarCollapsed && item.badge && (
              <span className="nav-badge" style={{ background: 'var(--color-danger-pulse)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', marginLeft: 'auto' }}>
                {item.badge}
              </span>
            )}
            {isSidebarCollapsed && item.badge && (
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: 'var(--color-danger-pulse)', borderRadius: '50%' }} />
            )}
          </button>
        ))}
      </nav>

      <div className="virtus-sidebar-footer">
        {!isSidebarCollapsed && (
          <div className="virtus-user-profile" style={{ marginBottom: '16px' }}>
            <div className="virtus-avatar">
              {displayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="virtus-user-info">
              <span className="virtus-user-name">{displayName}</span>
              <span className="virtus-user-role">COORDINATOR</span>
            </div>
          </div>
        )}
        
        <button className="virtus-nav-item" onClick={handleLogout} style={{ color: 'var(--color-danger)', opacity: 0.8 }}>
          <LogOut size={18} /> {!isSidebarCollapsed && <span className="nav-label">Log Out</span>}
        </button>
        
        <div className="virtus-collapse-btn-container" style={{ marginTop: '16px', display: 'flex', justifyContent: isSidebarCollapsed ? 'center' : 'flex-end' }}>
          <button className="virtus-collapse-btn" onClick={toggleSidebar}>
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  )
}
