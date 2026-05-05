import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { Shield, ArrowLeft } from 'lucide-react'
import type { UserRole } from '@/lib/types'
import type { Zone } from '@/lib/types'
import './AuthPage.css'

type AuthMode = 'login' | 'signup' | 'pin'

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, signup, loginWithGoogle, joinWithPin, isAuthenticated, role, isLoading, error, clearError } = useAuthStore()

  const [mode, setMode] = useState<AuthMode>((searchParams.get('mode') as AuthMode) || 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [pin, setPin] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('STEWARD')
  const [selectedZone, setSelectedZone] = useState('')
  const [availableZones, setAvailableZones] = useState<Zone[]>([])
  const [pinValidated, setPinValidated] = useState(false)
  const [eventName, setEventName] = useState('')
  const [localError, setLocalError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)

  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === 'ADMIN') navigate('/dashboard')
      else if (role === 'COORDINATOR') navigate('/coordinator')
      else if (role === 'STEWARD') navigate('/steward')
    }
  }, [isAuthenticated, role, navigate])

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    clearError()
    setLocalError('')
    setPinValidated(false)
    setSignupSuccess(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    try {
      await login(email, password)
    } catch {
      // Error handled by store
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }

    try {
      await signup(email, password, fullName)
      setSignupSuccess(true)
    } catch {
      // Error handled by store
    }
  }

  const handleValidatePin = async () => {
    setLocalError('')
    if (pin.length !== 6) {
      setLocalError('PIN must be 6 digits')
      return
    }

    try {
      const { data: event, error: err } = await supabase
        .from('events')
        .select('id, name, status')
        .eq('pin', pin)
        .in('status', ['ACTIVE', 'PAUSED'])
        .single()

      if (err || !event) {
        setLocalError('Event not found or PIN expired')
        return
      }

      // Load zones for this event
      const { data: zones } = await supabase
        .from('zones')
        .select('*')
        .eq('event_id', event.id)
        .order('label')

      setAvailableZones(zones || [])
      setEventName(event.name)
      setPinValidated(true)
    } catch {
      setLocalError('Failed to validate PIN')
    }
  }

  const handleJoinWithPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!displayName.trim()) {
      setLocalError('Please enter your name')
      return
    }
    if (selectedRole === 'COORDINATOR' && !selectedZone) {
      setLocalError('Coordinators must select a zone')
      return
    }

    try {
      await joinWithPin(pin, displayName, selectedRole, selectedZone || undefined)
    } catch {
      // Error handled by store
    }
  }

  const displayError = localError || error

  return (
    <div className="auth">
      <div className="auth__bg" />
      <div className="auth__card card-glass">
        <button className="auth__back btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="auth__header">
          <img 
            src="/main logo-png.png" 
            alt="Suraksha.pro Logo" 
            style={{ width: '100px', height: 'auto', marginBottom: 'var(--space-4)' }}
          />
          <h1 className="auth__title">Suraksha<span className="text-gold">.pro</span></h1>
        </div>

        {/* Tab Switcher */}
        <div className="tabs" style={{ marginBottom: 'var(--space-6)' }}>
          <button className={`tab ${mode === 'login' ? 'tab--active' : ''}`} onClick={() => switchMode('login')}>Login</button>
          <button className={`tab ${mode === 'signup' ? 'tab--active' : ''}`} onClick={() => switchMode('signup')}>Sign Up</button>
          <button className={`tab ${mode === 'pin' ? 'tab--active' : ''}`} onClick={() => switchMode('pin')}>Join with PIN</button>
        </div>

        {displayError && (
          <div className="auth__error">{displayError}</div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="auth__form">
            <div className="input-group">
              <label className="input-label">Email</label>
              <input type="email" className="input" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input type="password" className="input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-gold w-full" disabled={isLoading}>
              {isLoading ? <span className="spinner" /> : 'Login'}
            </button>

            <div className="auth__separator">OR</div>

            <button type="button" className="btn btn-google w-full" onClick={() => loginWithGoogle()} disabled={isLoading}>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </form>
        )}

        {/* Signup Form */}
        {mode === 'signup' && !signupSuccess && (
          <form onSubmit={handleSignup} className="auth__form">
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input type="text" className="input" placeholder="Raj Sharma" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input type="email" className="input" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input type="password" className="input" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <input type="password" className="input" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              Admin accounts require email verification.
            </p>
            <button type="submit" className="btn btn-gold w-full" disabled={isLoading}>
              {isLoading ? <span className="spinner" /> : 'Create Admin Account'}
            </button>

            <div className="auth__separator">OR</div>

            <button type="button" className="btn btn-google w-full" onClick={() => loginWithGoogle()} disabled={isLoading}>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>
          </form>
        )}

        {mode === 'signup' && signupSuccess && (
          <div className="auth__success">
            <p>✅ Account created! Check your email for verification link.</p>
            <button className="btn btn-outline w-full mt-4" onClick={() => switchMode('login')}>Go to Login</button>
          </div>
        )}

        {/* PIN Join Form */}
        {mode === 'pin' && !pinValidated && (
          <div className="auth__form">
            <div className="input-group">
              <label className="input-label">Event PIN</label>
              <input
                type="text"
                className="input auth__pin-input"
                placeholder="000000"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <button className="btn btn-gold w-full" onClick={handleValidatePin} disabled={pin.length !== 6}>
              Validate PIN
            </button>
          </div>
        )}

        {mode === 'pin' && pinValidated && (
          <form onSubmit={handleJoinWithPin} className="auth__form">
            <div className="auth__event-badge">
              Joining: <strong>{eventName}</strong>
            </div>
            <div className="input-group">
              <label className="input-label">Your Name</label>
              <input type="text" className="input" placeholder="Arjun Kumar" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Your Role</label>
              <div className="auth__role-selector">
                <button type="button" className={`auth__role-btn ${selectedRole === 'COORDINATOR' ? 'auth__role-btn--active' : ''}`} onClick={() => setSelectedRole('COORDINATOR')}>
                  Coordinator
                </button>
                <button type="button" className={`auth__role-btn ${selectedRole === 'STEWARD' ? 'auth__role-btn--active' : ''}`} onClick={() => setSelectedRole('STEWARD')}>
                  Steward
                </button>
              </div>
            </div>
            {availableZones.length > 0 && (
              <div className="input-group">
                <label className="input-label">Select Zone {selectedRole === 'COORDINATOR' ? '(Required)' : '(Optional)'}</label>
                <select className="input" value={selectedZone} onChange={e => setSelectedZone(e.target.value)}>
                  <option value="">-- Select Zone --</option>
                  {availableZones.map(z => (
                    <option key={z.id} value={z.id}>Zone {z.label}{z.name ? ` — ${z.name}` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="btn btn-gold w-full" disabled={isLoading}>
              {isLoading ? <span className="spinner" /> : 'Join Event'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
