import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminPanelStore } from '@/stores/adminPanelStore'

export default function AdminPanelLogin() {
  const navigate = useNavigate()
  const { login, checkAdminExists, adminExists, isAuthenticated, isLoading, error, clearError } = useAdminPanelStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/1234/admin/dashboard')
      return
    }

    checkAdminExists().then(exists => {
      if (!exists) {
        navigate('/1234/admin/setup')
      }
    })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await login(email, password)
      navigate('/1234/admin/dashboard')
    } catch {
      // handled by store
    }
  }

  if (adminExists === null) return <div className="page-centered"><div className="spinner spinner-lg"/></div>

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <h1 className="admin-login__title">System Admin</h1>
        
        {error && <div className="auth__error">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-form" style={{ width: '100%', maxWidth: 'none' }}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-4" disabled={isLoading}>
            {isLoading ? <span className="spinner" /> : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
