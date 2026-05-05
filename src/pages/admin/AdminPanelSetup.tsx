import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminPanelStore } from '@/stores/adminPanelStore'

export default function AdminPanelSetup() {
  const navigate = useNavigate()
  const { checkAdminExists, setupAdmin, adminExists, isLoading, error, clearError } = useAdminPanelStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    checkAdminExists().then(exists => {
      if (exists) {
        navigate('/1234/admin/login')
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    try {
      await setupAdmin(email, password)
      navigate('/1234/admin/login')
    } catch {
      // handled by store
    }
  }

  if (adminExists === null) return <div className="page-centered"><div className="spinner spinner-lg"/></div>
  if (adminExists) return null

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <h1 className="admin-login__title">Admin Setup</h1>
        <p className="text-secondary text-center mb-6" style={{ fontSize: 'var(--text-sm)' }}>
          Create the master admin account for the platform.
        </p>
        
        {error && <div className="auth__error">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-form" style={{ width: '100%', maxWidth: 'none' }}>
          <div className="input-group">
            <label className="input-label">Admin Email</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <input type="password" className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-4" disabled={isLoading}>
            {isLoading ? <span className="spinner" /> : 'Create Admin'}
          </button>
        </form>
      </div>
    </div>
  )
}
