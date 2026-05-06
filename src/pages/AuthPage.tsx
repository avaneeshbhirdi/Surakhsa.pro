import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import type { UserRole } from '@/lib/types'
import type { Zone } from '@/lib/types'
import './AuthPage.css'

type AuthMode = 'select' | 'login' | 'signup' | 'pin'

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, signup, loginWithGoogle, joinWithPin, isAuthenticated, role, isLoading, error, clearError } = useAuthStore()
  const { t } = useLang()

  // Handle Google OAuth return: apply pending role if one was saved before redirect
  useEffect(() => {
    const pendingRole = localStorage.getItem('suraksha_pending_role') as UserRole | null
    if (pendingRole && isAuthenticated && role === 'GUEST') {
      // Apply the role the user selected before the OAuth redirect
      import('@/lib/supabase').then(({ supabase }) => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            supabase
              .from('profiles')
              .update({ role: pendingRole })
              .eq('auth_user_id', session.user.id)
              .then(() => {
                localStorage.removeItem('suraksha_pending_role')
                // Re-initialize to pick up the updated role
                useAuthStore.getState().initialize()
              })
          }
        })
      })
    } else if (pendingRole && isAuthenticated) {
      localStorage.removeItem('suraksha_pending_role')
    }
  }, [isAuthenticated])

  const [mode, setMode] = useState<AuthMode>((searchParams.get('mode') as AuthMode) || 'select')
  const [userType, setUserType] = useState<UserRole | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [pin, setPin] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('COORDINATOR')
  const [selectedZone, setSelectedZone] = useState('')
  const [availableZones, setAvailableZones] = useState<Zone[]>([])
  const [pinValidated, setPinValidated] = useState(false)
  const [eventName, setEventName] = useState('')
  const [localError, setLocalError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [verificationSuccess, setVerificationSuccess] = useState(false)

  useEffect(() => {
    // Check for email verification success in URL hash or query
    const isReturningFromAuth = window.location.hash.includes('access_token') || 
                                searchParams.get('type') === 'signup'
    
    if (isReturningFromAuth) {
      setVerificationSuccess(true)
      setMode('login')
      // Clear the hash/params to prevent repeated messages
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [searchParams])

  useEffect(() => {
    if (isAuthenticated && role) {
      const pendingRole = localStorage.getItem('suraksha_pending_role')
      
      // If there's a pending role update, don't redirect yet. 
      // The other useEffect will update the DB and re-trigger state.
      if (pendingRole && role === 'GUEST') return

      if (role === 'ADMIN') navigate('/dashboard')
      else if (role === 'EVENT_MANAGER') navigate('/manager')
      else if (role === 'COORDINATOR') navigate('/coordinator')
      else if (role === 'GUEST') navigate('/guest')
    }
  }, [isAuthenticated, role, navigate])

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    clearError()
    setLocalError('')
    setEmailError('')
    setPinValidated(false)
    setSignupSuccess(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setEmailError('')

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      setEmailError('Invalid email format')
      return
    }

    try {
      await login(email, password)
    } catch {
      // Error handled by store
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setEmailError('')

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const disposableDomains = ['mailinator.com', 'yopmail.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com']
    
    if (!emailRegex.test(email)) {
      setEmailError('Invalid email format (e.g., user@example.com)')
      return
    }
    
    const domain = email.split('@')[1]?.toLowerCase()
    if (disposableDomains.includes(domain)) {
      setEmailError('Please use a permanent email address, not a temporary one.')
      return
    }

    try {
      await signup(email, password, fullName, userType || 'GUEST')
      setSignupSuccess(true)
    } catch (err: unknown) {
      // Detect email-specific errors so user only needs to fix the email field
      const msg = err instanceof Error ? err.message : String(err)
      const storeErr = useAuthStore.getState().error || ''
      const combined = (msg + storeErr).toLowerCase()
      if (
        combined.includes('email') ||
        combined.includes('already registered') ||
        combined.includes('already in use') ||
        combined.includes('invalid email') ||
        combined.includes('user already exists')
      ) {
        setEmailError(storeErr || msg || 'Email error — please check and correct your email')
        clearError() // clear global so banner doesn't double-show
      }
      // Non-email errors will show in the global error banner
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

  const displayError = localError || (emailError ? '' : error)

  return (
    <div className="auth">
      <div className="auth__bg" />
      <div className="auth__card auth__card--glass">
        <button className="auth__back btn btn-ghost btn-sm" onClick={() => {
          if (mode === 'select') navigate('/')
          else setMode('select')
        }}>
          <ArrowLeft size={16} /> {t('back')}
        </button>
        <div style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)' }}><LanguageSwitcher compact /></div>

        <div className="auth__header">
          <img 
            src="/main logo-png.png" 
            alt="Suraksha.pro Logo" 
            style={{ width: '100px', height: 'auto', marginBottom: 'var(--space-4)' }}
          />
          <h1 className="auth__title">Suraksha<span className="text-gold">.pro</span></h1>
        </div>

        {/* Role Selection Screen */}
        {mode === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', marginTop: '1rem' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--color-text-secondary)', fontSize: 'var(--text-lg)' }}>
              {t('authWelcome')}
            </h2>
            
            {/* Primary Action for Guests/Staff */}
            <button 
              className="btn btn-gold" 
              style={{ 
                padding: '1.75rem 1.25rem', 
                fontSize: 'var(--text-xl)', 
                fontWeight: 'bold',
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
              }}
              onClick={() => switchMode('pin')}
            >
              {t('authJoinPin')}
            </button>

            <div className="auth__separator">OR</div>
            
            {/* Secondary Action for Managers */}
            <button 
              className="btn btn-outline" 
              style={{ padding: '1rem', fontSize: 'var(--text-base)', opacity: 0.8 }}
              onClick={() => { setUserType('EVENT_MANAGER'); switchMode('login'); }}
            >
              {t('authManagerLogin')}
            </button>
          </div>
        )}

        {/* Tab Switcher for Login/Signup */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="tabs" style={{ marginBottom: 'var(--space-6)' }}>
            <button className={`tab ${mode === 'login' ? 'tab--active' : ''}`} onClick={() => switchMode('login')}>
              {t('authManagerLogin')}
            </button>
            <button className={`tab ${mode === 'signup' ? 'tab--active' : ''}`} onClick={() => switchMode('signup')}>
              {t('authManagerSignup')}
            </button>
          </div>
        )}

        {mode === 'pin' && (
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold' }}>Join Event via PIN</h2>
          </div>
        )}

        {displayError && (
          <div className="auth__error">{displayError}</div>
        )}

        {verificationSuccess && !displayError && (
          <div className="auth__success" style={{ marginBottom: 'var(--space-4)', border: '1px solid #4dff4d', color: '#4dff4d', background: 'rgba(77, 255, 77, 0.1)' }}>
            ✅ Email verified successfully! You can now log in.
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="auth__form">
            <div className="input-group">
              <label className="input-label">{t('authEmail')}</label>
              <input
                type="email" className="input"
                placeholder="admin@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError('') }}
                required
                style={emailError ? { borderColor: 'var(--color-danger, #ff4d4d)', boxShadow: '0 0 0 2px rgba(255,77,77,0.2)' } : {}}
              />
            </div>
            <div className="input-group">
              <label className="input-label">{t('authPassword')}</label>
              <input type="password" className="input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-gold w-full" disabled={isLoading}>
              {isLoading ? <span className="spinner" /> : t('authLogin')}
            </button>

            <div className="auth__separator">OR</div>

            <button type="button" className="btn btn-google w-full" onClick={() => { if (userType) localStorage.setItem('suraksha_pending_role', userType); loginWithGoogle() }} disabled={isLoading}>
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
              <label className="input-label">{t('authFullName')}</label>
              <input type="text" className="input" placeholder="Raj Sharma" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                type="email" className="input"
                placeholder="admin@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError('') }}
                required
                style={emailError ? { borderColor: 'var(--color-danger, #ff4d4d)', boxShadow: '0 0 0 2px rgba(255,77,77,0.2)' } : {}}
              />
              {emailError && (
                <p style={{ color: 'var(--color-danger, #ff4d4d)', fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✕ {emailError}
                </p>
              )}
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
              Manager accounts require email verification.
            </p>
            <button type="submit" className="btn btn-gold w-full" disabled={isLoading}>
              {isLoading ? <span className="spinner" /> : t('authCreateAccount')}
            </button>

            <div className="auth__separator">OR</div>

            <button type="button" className="btn btn-google w-full" onClick={() => { if (userType) localStorage.setItem('suraksha_pending_role', userType); loginWithGoogle() }} disabled={isLoading}>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>
          </form>
        )}

        {mode === 'signup' && signupSuccess && (
          <div className="auth__success">
            <p>{t('authAccountCreated')}</p>
            <button className="btn btn-outline w-full mt-4" onClick={() => switchMode('login')}>{t('authGoToLogin')}</button>
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
              {t('authValidatePin')}
            </button>
          </div>
        )}

        {mode === 'pin' && pinValidated && (
          <form onSubmit={handleJoinWithPin} className="auth__form">
            <div className="auth__event-badge">
              Joining: <strong>{eventName}</strong>
            </div>
            <div className="input-group">
              <label className="input-label">{t('authYourName')}</label>
              <input type="text" className="input" placeholder="Arjun Kumar" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">{t('authYourRole')}</label>
              <div className="auth__role-selector">
                <button type="button" className={`auth__role-btn ${selectedRole === 'COORDINATOR' ? 'auth__role-btn--active' : ''}`} onClick={() => setSelectedRole('COORDINATOR')}>
                  {t('authCoordinator')}
                </button>
                <button type="button" className={`auth__role-btn ${selectedRole === 'GUEST' ? 'auth__role-btn--active' : ''}`} onClick={() => setSelectedRole('GUEST')}>
                  {t('authGuest')}
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
              {isLoading ? <span className="spinner" /> : t('authJoinEvent')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
