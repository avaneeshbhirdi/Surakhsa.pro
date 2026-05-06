import { useEffect, useState, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useEventStore } from '@/stores/eventStore'
import { supabase } from '@/lib/supabase'

// Pages
import SplashScreen from '@/pages/SplashScreen'
import LandingPage from '@/pages/LandingPage'
import AuthPage from '@/pages/AuthPage'
import AdminDashboard from '@/pages/AdminDashboard'
import CoordinatorApp from '@/pages/CoordinatorApp'
import ManagerDashboard from '@/pages/ManagerDashboard'
import ManagerZones from '@/pages/ManagerZones'
import ManagerMap from '@/pages/ManagerMap'
import ManagerAnalytics from '@/pages/ManagerAnalytics'
import ManagerComms from '@/pages/ManagerComms'
import ManagerAlerts from '@/pages/ManagerAlerts'
import ManagerSettings from '@/pages/ManagerSettings'
import ManagerCoordinators from '@/pages/ManagerCoordinators'
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

// ── Global simulation runner — survives page navigation ──
function SimulationRunner() {
  const { isSimulating } = useUIStore()
  const { activeEvent, zones, latestReadings } = useEventStore()
  const zonesRef = useRef(zones)
  const readingsRef = useRef(latestReadings)
  zonesRef.current = zones
  readingsRef.current = latestReadings

  useEffect(() => {
    if (!isSimulating || !activeEvent || zonesRef.current.length === 0) return

    const interval = setInterval(async () => {
      const zList = zonesRef.current
      if (zList.length === 0) return
      const z = zList[Math.floor(Math.random() * zList.length)]
      const currentDensity = readingsRef.current[z.id]?.density ?? Math.floor(z.capacity * 0.2)
      const diff = Math.floor(Math.random() * 25) - 5
      const newDensity = Math.max(0, Math.min(z.capacity * 1.5, currentDensity + diff))
      const pct = z.capacity > 0 ? (newDensity / z.capacity) * 100 : 0
      let riskScore = Math.min(100, Math.floor(pct))
      let riskType = 'NORMAL'
      let colorState = 'GREEN'
      if (pct > 95) { riskType = 'STAMPEDE_RISK'; riskScore = Math.max(90, riskScore); colorState = 'RED' }
      else if (pct > 80) { riskType = 'BOTTLENECK'; riskScore = Math.max(75, riskScore); colorState = 'YELLOW' }
      else if (pct > 60) { riskType = 'SURGE'; riskScore = Math.max(50, riskScore); colorState = 'YELLOW' }

      await supabase.from('zone_readings').insert({
        event_id: activeEvent.id, zone_id: z.id,
        density: newDensity, flow_rate: Math.random() * 5 + 1,
        risk_score: riskScore, risk_type: riskType, color_state: colorState,
      })

      if (pct > 85 && Math.random() > 0.7) {
        await supabase.from('alerts').insert({
          event_id: activeEvent.id, zone_id: z.id,
          risk_type: riskType, risk_score: riskScore,
          priority: pct > 95 ? 'CRITICAL' : 'HIGH',
          message: `Auto alert: High density in Zone ${z.label}!`,
          status: 'TRIGGERED',
        })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isSimulating, activeEvent?.id])

  return null
}

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
    <>
      <SimulationRunner />
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
      <Route path="/manager/map" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER']}>
          <ManagerMap />
        </ProtectedRoute>
      } />
      <Route path="/manager/coordinators" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER']}>
          <ManagerCoordinators />
        </ProtectedRoute>
      } />
      <Route path="/manager/analytics" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER']}>
          <ManagerAnalytics />
        </ProtectedRoute>
      } />
      <Route path="/manager/comms" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER']}>
          <ManagerComms />
        </ProtectedRoute>
      } />
      <Route path="/manager/alerts" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER']}>
          <ManagerAlerts />
        </ProtectedRoute>
      } />
      <Route path="/manager/settings" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'EVENT_MANAGER']}>
          <ManagerSettings />
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
    </>
  )
}

export default App
