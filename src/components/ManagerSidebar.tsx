import { Home, Calendar, Target, Folder, MessageSquare, Bell, Settings, LogOut, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

export default function ManagerSidebar() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <aside className="virtus-sidebar">
      <div className="virtus-sidebar-header">
        <div className="virtus-logo-container">
          <div className="virtus-logo-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 12V6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V12C20 13.1046 19.1046 14 18 14H6C4.89543 14 4 13.1046 4 12Z" fill="#F06543"/>
              <path d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z" stroke="#F06543" strokeWidth="2"/>
            </svg>
          </div>
          <span className="virtus-logo-text">Suraksha</span>
        </div>
      </div>

      <div className="virtus-search">
        <Search size={16} />
        <input type="text" placeholder="Search" />
      </div>

      <nav className="virtus-nav">
        <button className="virtus-nav-item active">
          <Home size={18} /> Home
        </button>
        <button className="virtus-nav-item" onClick={() => navigate('/event/history')}>
          <Calendar size={18} /> Schedule
        </button>
        <button className="virtus-nav-item">
          <Target size={18} /> Progress
        </button>
        <button className="virtus-nav-item">
          <Folder size={18} /> Projects
        </button>
        <button className="virtus-nav-item">
          <MessageSquare size={18} /> Chats
        </button>
        <div className="virtus-nav-divider" />
        <button className="virtus-nav-item">
          <Bell size={18} /> Notifications
          <span className="virtus-badge">4</span>
        </button>
        <button className="virtus-nav-item">
          <Settings size={18} /> Settings
        </button>
      </nav>

      <div className="virtus-sidebar-footer">
        <button className="virtus-nav-item logout" onClick={() => logout()}>
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  )
}
