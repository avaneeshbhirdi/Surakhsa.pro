import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminPanelStore } from '@/stores/adminPanelStore'
import { supabase } from '@/lib/supabase'

interface AdminPanelGuardProps {
  children: React.ReactNode
}

export default function AdminPanelGuard({ children }: AdminPanelGuardProps) {
  const { isAuthenticated } = useAdminPanelStore()
  const [checked, setChecked] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const runChecks = async () => {
      // Check for existing admin session in localStorage
      const sessionStr = localStorage.getItem('suraksha_admin_session')
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr)
          // Check if session is less than 24 hours old
          if (Date.now() - session.ts < 24 * 60 * 60 * 1000) {
            useAdminPanelStore.setState({
              isAuthenticated: true,
              adminId: session.adminId,
              adminEmail: session.adminEmail,
            })
          } else {
            localStorage.removeItem('suraksha_admin_session')
          }
        } catch {
          localStorage.removeItem('suraksha_admin_session')
        }
      }

      // Role double-check: if a regular Supabase user is logged in,
      // ensure they don't have access to the admin panel regardless
      // of a potentially spoofed localStorage session.
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      if (supabaseSession) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('auth_user_id', supabaseSession.user.id)
          .single()

        if (profile && profile.role !== 'ADMIN') {
          // Regular non-admin Supabase user — block access and clear any
          // localStorage session they might have injected
          localStorage.removeItem('suraksha_admin_session')
          useAdminPanelStore.setState({ isAuthenticated: false })
          setBlocked(true)
        }
      }

      setChecked(true)
    }

    runChecks()
  }, [])

  if (!checked) {
    return (
      <div className="page-centered">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (blocked || !isAuthenticated) {
    return <Navigate to="/1234/admin/login" replace />
  }

  return <>{children}</>
}

