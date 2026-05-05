import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to appropriate page based on role
    if (role === 'ADMIN') return <Navigate to="/dashboard" replace />
    if (role === 'EVENT_MANAGER') return <Navigate to="/manager" replace />
    if (role === 'COORDINATOR') return <Navigate to="/coordinator" replace />
    if (role === 'GUEST') return <Navigate to="/guest" replace />
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
