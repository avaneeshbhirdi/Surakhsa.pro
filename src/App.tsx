import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// Pages
import SplashScreen from '@/pages/SplashScreen'
import LandingPage from '@/pages/LandingPage'
import AuthPage from '@/pages/AuthPage'
import AdminDashboard from '@/pages/AdminDashboard'
import CoordinatorApp from '@/pages/CoordinatorApp'
import ManagerDashboard from '@/pages/ManagerDashboard'
import ManagerZones from '@/pages/ManagerZones'
import GuestApp from '@/pages/GuestApp'
import CreateEvent from '@/pages/CreateEvent'
import EventHistory from '@/pages/EventHistory'

// Admin Panel
import AdminPanelLogin from '@/pages/admin/AdminPanelLogin'
import AdminPanelSetup from '@/pages/admin/AdminPanelSetup'
import AdminPanelLayout from '@/pages/admin/AdminPanelLayout'
import AdminPanelDashboard from '@/pages/admin/AdminPanelDashboard'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminEvents from '@/pages/admin/AdminEvents'
import AdminAnalytics from '@/pages/admin/AdminAnalytics'

// Components
import ProtectedRoute from '@/components/ProtectedRoute'
import AdminPanelGuard from '@/components/AdminPanelGuard'

function App() {
  const { initialize, isLoading } = useAuthStore()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    initialize()
    const timer = setTimeout(() => setShowSplash(false), 2500)
    return () => clearTimeout(timer)
  }, [initialize])

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  if (isLoading) {
    return (
      <div className="page-centered">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />

      {/* Protected user routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/manager" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER']}>
          <ManagerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/manager/zones" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER']}>
          <ManagerZones />
        </ProtectedRoute>
      } />
      <Route path="/coordinator" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER', 'COORDINATOR']}>
          <CoordinatorApp />
        </ProtectedRoute>
      } />
      <Route path="/guest" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER', 'COORDINATOR', 'GUEST']}>
          <GuestApp />
        </ProtectedRoute>
      } />
      <Route path="/event/create" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER']}>
          <CreateEvent />
        </ProtectedRoute>
      } />
      <Route path="/event/history" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER']}>
          <EventHistory />
        </ProtectedRoute>
      } />

      {/* Admin Panel routes — hidden, not linked anywhere in UI */}
      <Route path="/1234/admin/login" element={<AdminPanelLogin />} />
      <Route path="/1234/admin/setup" element={<AdminPanelSetup />} />
      <Route path="/1234/admin" element={
        <AdminPanelGuard>
          <AdminPanelLayout />
        </AdminPanelGuard>
      }>
        <Route index element={<AdminPanelDashboard />} />
        <Route path="dashboard" element={<AdminPanelDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="analytics" element={<AdminAnalytics />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
