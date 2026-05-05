import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminPanelStore } from '@/stores/adminPanelStore'

// Password strength validation
function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character'
  return null
}

// Generate a random 6-digit OTP (simulated — shown to admin after password verified)
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default function AdminPanelLogin() {
  const navigate = useNavigate()
  const { login, checkAdminExists, adminExists, isAuthenticated, isLoading, error, clearError } = useAdminPanelStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // OTP step state
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [otpCode, setOtpCode] = useState('')
  const [generatedOTP, setGeneratedOTP] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [otpError, setOtpError] = useState('')

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

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setPasswordError('')

    // Strong password validation
    const pwError = validatePassword(password)
    if (pwError) {
      setPasswordError(pwError)
      return
    }

    try {
      // Verify credentials first (we call login but if it succeeds we intercept with OTP)
      // To keep this non-destructive, we validate credentials against the store
      // then show the OTP step before finalizing
      await login(email, password)
      // Login succeeded — generate OTP and move to step 2
      // (We'll sign out the admin panel session until OTP is confirmed)
      const otp = generateOTP()
      setGeneratedOTP(otp)
      setOtpCode(otp) // In production this would be emailed
      // Reset auth so user must complete OTP step
      useAdminPanelStore.setState({ isAuthenticated: false })
      setStep('otp')
    } catch {
      // Error handled by store
    }
  }

  const handleOTPVerify = (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError('')

    if (otpInput.trim() !== generatedOTP) {
      setOtpError('Invalid verification code. Please try again.')
      return
    }

    // OTP verified — restore authenticated session
    useAdminPanelStore.setState({
      isAuthenticated: true,
    })
    // Persist session
    localStorage.setItem('suraksha_admin_session', JSON.stringify({
      ts: Date.now(),
      adminEmail: email,
    }))
    navigate('/1234/admin/dashboard')
  }

  if (adminExists === null) {
    return <div className="page-centered"><div className="spinner spinner-lg"/></div>
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <h1 className="admin-login__title">System Admin</h1>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '16px' }}>
          Restricted Access — Authorized Personnel Only
        </p>

        {error && <div className="auth__error">{error}</div>}

        {/* ── Step 1: Credentials ── */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentials} className="admin-form" style={{ width: '100%', maxWidth: 'none' }}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  setPasswordError('')
                }}
                required
                autoComplete="new-password"
              />
              {passwordError && (
                <p style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px' }}>
                  {passwordError}
                </p>
              )}
              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Must have: 8+ chars · 1 uppercase · 1 number · 1 special character
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full mt-4" disabled={isLoading}>
              {isLoading ? <span className="spinner" /> : 'Continue →'}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP Verification ── */}
        {step === 'otp' && (
          <form onSubmit={handleOTPVerify} className="admin-form" style={{ width: '100%', maxWidth: 'none' }}>
            <div style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-gold)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                Verification Code (sent to {email})
              </p>
              <p style={{
                fontSize: '28px',
                fontWeight: 'bold',
                letterSpacing: '8px',
                color: 'var(--color-gold)',
                fontFamily: 'monospace',
              }}>
                {otpCode}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                In production, this code would be emailed to you.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">Enter Verification Code</label>
              <input
                type="text"
                className="input"
                placeholder="000000"
                maxLength={6}
                value={otpInput}
                onChange={e => {
                  setOtpInput(e.target.value.replace(/\D/g, ''))
                  setOtpError('')
                }}
                required
                autoFocus
                style={{ letterSpacing: '6px', fontSize: '20px', textAlign: 'center' }}
              />
              {otpError && (
                <p style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '4px' }}>
                  {otpError}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-full mt-4">
              Verify & Login
            </button>
            <button
              type="button"
              className="btn btn-ghost w-full mt-2"
              style={{ fontSize: '12px' }}
              onClick={() => { setStep('credentials'); setOtpInput(''); setOtpError('') }}
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
