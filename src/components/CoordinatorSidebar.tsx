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
        <div className="virtus-profile-preview" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
          <div className="v-avatar" style={{ width: '32px', height: '32px', fontSize: '12px', flexShrink: 0 }}>
            {displayName.substring(0, 2).toUpperCase()}
          </div>
          {!isSidebarCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div className="v-text-sm" style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div className="v-text-xs" style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>COORDINATOR</div>
            </div>
          )}
        </div>
        
        <button className="virtus-nav-item" onClick={handleLogout} style={{ color: 'var(--color-danger)', opacity: 0.8, justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
          <LogOut size={18} /> {!isSidebarCollapsed && <span className="nav-label">Log Out</span>}
        </button>
        
        <button className="virtus-nav-item" onClick={toggleSidebar} style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />} 
          {!isSidebarCollapsed && <span className="nav-label">Collapse Menu</span>}
        </button>
      </div>
    </aside>
  )
}
