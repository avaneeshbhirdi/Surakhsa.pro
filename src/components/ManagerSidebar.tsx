import { Home, Calendar, Target, Folder, MessageSquare, Bell, Settings, LogOut, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

export default function ManagerSidebar() {
  const { logout, profile } = useAuthStore()
  const navigate = useNavigate()

  return (
    <aside className="virtus-sidebar">
      <div className="virtus-sidebar-header">
        <div className="virtus-logo-container" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src="/main logo-png.png" alt="Logo" style={{ height: '24px', marginRight: '8px' }} />
          <span className="virtus-logo-text">Suraksha<span style={{ color: 'var(--v-orange)' }}>.pro</span></span>
        </div>
      </div>

      <div className="virtus-search">
        <Search size={16} />
        <input type="text" placeholder="Search feature..." />
      </div>

      <nav className="virtus-nav">
        <button className="virtus-nav-item active" onClick={() => navigate('/manager')}>
          <Home size={18} /> Home
        </button>
        <button className="virtus-nav-item" onClick={() => navigate('/event/history')}>
          <Calendar size={18} /> History
        </button>
        <button className="virtus-nav-item">
          <Target size={18} /> Map
        </button>
        <button className="virtus-nav-item">
          <Folder size={18} /> Analytics
        </button>
        <button className="virtus-nav-item">
          <MessageSquare size={18} /> Comms
        </button>
        <div className="virtus-nav-divider" />
        <button className="virtus-nav-item">
          <Bell size={18} /> Alerts
          <span className="virtus-badge">!</span>
        </button>
        <button className="virtus-nav-item">
          <Settings size={18} /> Settings
        </button>
      </nav>

      <div className="virtus-sidebar-footer">
        <div className="virtus-profile-preview" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '12px', 
          marginBottom: '12px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px'
        }}>
          <div className="v-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
            {profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'M'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div className="v-text-sm" style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {profile?.full_name || 'Manager'}
            </div>
            <div className="v-text-xs" style={{ opacity: 0.5 }}>Event Lead</div>
          </div>
        </div>
        <button className="virtus-nav-item logout" onClick={() => logout()}>
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  )
}
