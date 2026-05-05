import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Shield, LayoutDashboard, PlusCircle, Clock, LogOut } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, role, profile, pinSession } = useAuthStore()

  const displayName = profile?.full_name || pinSession?.displayName || 'User'
  const isActive = (path: string) => location.pathname === path

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="header">
      <div className="header__left">
        <img 
          src="/main logo-png.png" 
          alt="Suraksha.pro" 
          style={{ height: '28px', width: 'auto', marginRight: '8px' }}
        />
        <span className="header__title" style={{ fontSize: 'var(--text-base)' }}>
          Suraksha<span className="text-gold">.pro</span>
        </span>
      </div>

      {role === 'ADMIN' && (
        <div className="flex gap-1 hide-on-mobile">
          <button className={`btn btn-sm ${isActive('/dashboard') ? 'btn-primary' : 'btn-ghost'}`} onClick={() => navigate('/dashboard')}>
            <LayoutDashboard size={14} /> Dashboard
          </button>
          <button className={`btn btn-sm ${isActive('/event/create') ? 'btn-primary' : 'btn-ghost'}`} onClick={() => navigate('/event/create')}>
            <PlusCircle size={14} /> Create
          </button>
          <button className={`btn btn-sm ${isActive('/event/history') ? 'btn-primary' : 'btn-ghost'}`} onClick={() => navigate('/event/history')}>
            <Clock size={14} /> History
          </button>
        </div>
      )}

      <div className="header__right">
        <span className="text-secondary hide-on-mobile" style={{ fontSize: 'var(--text-sm)' }}>{displayName}</span>
        <span className="badge badge-info" style={{ fontSize: 'var(--text-xs)' }}>{role}</span>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}
