import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LayoutDashboard, PlusCircle, Clock, LogOut } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, role, profile, pinSession } = useAuthStore()

  const displayName = profile?.full_name || pinSession?.displayName || 'User'
  const isActive = (path: string) => location.pathname === path

  const getDashboardRoute = () => {
    if (role === 'ADMIN') return '/dashboard'
    if (role === 'EVENT_MANAGER') return '/manager'
    if (role === 'COORDINATOR') return '/coordinator'
    if (role === 'GUEST') return '/guest'
    return '/'
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="header">
      <div 
        className="header__left" 
        onClick={() => navigate(getDashboardRoute())}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'opacity 0.2s' }}
        onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
        onMouseOut={e => e.currentTarget.style.opacity = '1'}
      >
        <img 
          src="/main logo-png.png" 
          alt="Suraksha.pro" 
          style={{ height: '28px', width: 'auto', marginRight: '8px' }}
        />
        <span className="header__title" style={{ fontSize: 'var(--text-base)' }}>
          Suraksha<span className="text-gold">.pro</span>
        </span>
      </div>

      {(role === 'ADMIN' || role === 'EVENT_MANAGER') && (
        <div className="flex gap-1 hide-on-mobile">
          <button 
            className={`btn btn-sm ${isActive(role === 'ADMIN' ? '/dashboard' : '/manager') ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => navigate(role === 'ADMIN' ? '/dashboard' : '/manager')}
          >
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

      <div className="header__right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-bg-elevated) 0%, #3D1A22 100%)',
              border: '1px solid var(--color-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--color-gold)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              overflow: 'hidden'
            }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getInitials(displayName)
            )}
          </div>
          <div className="hide-on-mobile" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text)', lineHeight: '1.2' }}>
              {displayName}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {role?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={handleLogout}
          title="Log Out"
          style={{ padding: '6px' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}
