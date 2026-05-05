import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminPanelStore } from '@/stores/adminPanelStore'

interface AdminPanelGuardProps {
  children: React.ReactNode
}

export default function AdminPanelGuard({ children }: AdminPanelGuardProps) {
  const { isAuthenticated } = useAdminPanelStore()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Check for existing session in localStorage
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
    setChecked(true)
  }, [])

  if (!checked) {
    return (
      <div className="page-centered">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/1234/admin" replace />
  }

  return <>{children}</>
}
