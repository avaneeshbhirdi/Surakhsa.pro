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

// ── Zone lifecycle phases ──
type ZonePhase = 'IDLE' | 'BUILDING' | 'PEAK' | 'RECOVERING'

interface ZoneState {
  phase: ZonePhase
  density: number          // current people count
  ticksInPhase: number     // how many ticks spent in this phase
  phaseDuration: number    // how many ticks before forced phase change
  forceRecovery: boolean   // set when manager ACKs/resolves the alert
}

// ── Realistic steward messages per phase ──
const STEWARD_MESSAGES: Record<ZonePhase, { status: 'ALL_CLEAR' | 'CROWD_BUILDING' | 'EMERGENCY'; msg: string }[]> = {
  IDLE: [
    { status: 'ALL_CLEAR', msg: 'Zone is calm, crowd moving freely.' },
    { status: 'ALL_CLEAR', msg: 'No issues. Flow is steady.' },
    { status: 'ALL_CLEAR', msg: 'All clear. Attendance normal.' },
  ],
  BUILDING: [
    { status: 'CROWD_BUILDING', msg: 'Crowd beginning to build up at entry points.' },
    { status: 'CROWD_BUILDING', msg: 'Density increasing steadily — keeping watch.' },
    { status: 'CROWD_BUILDING', msg: 'Noticing slower movement near gates.' },
  ],
  PEAK: [
    { status: 'EMERGENCY', msg: 'Zone at critical capacity! Requesting backup.' },
    { status: 'EMERGENCY', msg: 'Entry gates overflowing — need crowd control NOW.' },
    { status: 'EMERGENCY', msg: 'Pressure building at barriers. Crowd not dispersing.' },
  ],
  RECOVERING: [
    { status: 'CROWD_BUILDING', msg: 'Crowd starting to thin out after intervention.' },
    { status: 'ALL_CLEAR', msg: 'Density dropping — overflow gates helping.' },
    { status: 'ALL_CLEAR', msg: 'Zone recovering. Movement improving.' },
  ],
}

// ── Global simulation runner — survives page navigation ──
function SimulationRunner() {
  const { isSimulating } = useUIStore()
  const { activeEvent, zones, alerts, latestReadings } = useEventStore()

  // Stable refs to avoid stale closures inside interval
  const zonesRef    = useRef(zones)
  const alertsRef   = useRef(alerts)
  const readingsRef = useRef(latestReadings)
  const eventRef    = useRef(activeEvent)
  zonesRef.current    = zones
  alertsRef.current   = alerts
  readingsRef.current = latestReadings
  eventRef.current    = activeEvent

  // Per-zone mutable state (not React state — we don't want re-renders)
  const zoneStates = useRef<Record<string, ZoneState>>({})

  useEffect(() => {
    if (!isSimulating || !activeEvent) return

    // ── Initialise zone states for any new zones ──
    zonesRef.current.forEach(z => {
      if (!zoneStates.current[z.id]) {
        const existingDensity = readingsRef.current[z.id]?.density ?? Math.floor(z.capacity * 0.25)
        zoneStates.current[z.id] = {
          phase: 'IDLE',
          density: existingDensity,
          ticksInPhase: 0,
          phaseDuration: Math.floor(Math.random() * 5) + 4, // 4–8 ticks in IDLE
          forceRecovery: false,
        }
      }
    })

    const interval = setInterval(async () => {
      const zList  = zonesRef.current
      const event  = eventRef.current
      if (zList.length === 0 || !event) return

      // ── Check if zones with TRIGGERED alerts got ACKed/Resolved → force recovery ──
      zList.forEach(z => {
        const zs = zoneStates.current[z.id]
        if (!zs) return
        const hasTriggered = alertsRef.current.some(
          a => a.zone_id === z.id && a.status === 'TRIGGERED'
        )
        // If we were at PEAK but manager cleared all triggered alerts → recover
        if (zs.phase === 'PEAK' && !hasTriggered) {
          zs.forceRecovery = true
        }
      })

      const readings: {
        event_id: string; zone_id: string; density: number; flow_rate: number;
        risk_score: number; risk_type: string; color_state: string
      }[] = []

      const newAlerts: {
        event_id: string; zone_id: string; risk_type: string; risk_score: number;
        priority: string; message: string; recommended_action: string; status: string
      }[] = []

      const stewardInserts: {
        event_id: string; zone_id: string; staff_id: string; status: string; message: string
      }[] = []

      for (const z of zList) {
        let zs = zoneStates.current[z.id]
        if (!zs) {
          zs = {
            phase: 'IDLE',
            density: Math.floor(z.capacity * 0.25),
            ticksInPhase: 0,
            phaseDuration: Math.floor(Math.random() * 5) + 4,
            forceRecovery: false,
          }
          zoneStates.current[z.id] = zs
        }

        zs.ticksInPhase++

        // ── Force recovery if manager resolved alert ──
        if (zs.forceRecovery && zs.phase !== 'RECOVERING') {
          zs.phase = 'RECOVERING'
          zs.ticksInPhase = 0
          zs.phaseDuration = Math.floor(Math.random() * 4) + 4 // 4–7 ticks
          zs.forceRecovery = false
        }

        // ── Natural phase transitions ──
        if (zs.ticksInPhase >= zs.phaseDuration) {
          zs.ticksInPhase = 0
          switch (zs.phase) {
            case 'IDLE':
              // 40% chance to start building, otherwise stay idle longer
              if (Math.random() < 0.40) {
                zs.phase = 'BUILDING'
                zs.phaseDuration = Math.floor(Math.random() * 6) + 5 // 5–10 ticks
              } else {
                zs.phaseDuration = Math.floor(Math.random() * 6) + 4
              }
              break
            case 'BUILDING':
              zs.phase = 'PEAK'
              zs.phaseDuration = Math.floor(Math.random() * 5) + 3 // 3–7 ticks at peak
              break
            case 'PEAK':
              zs.phase = 'RECOVERING'
              zs.phaseDuration = Math.floor(Math.random() * 5) + 4 // 4–8 ticks recovery
              break
            case 'RECOVERING':
              zs.phase = 'IDLE'
              zs.phaseDuration = Math.floor(Math.random() * 6) + 4
              break
          }
        }

        // ── Compute new density based on phase ──
        const cap = z.capacity
        let delta = 0
        let flowRate = 0
        switch (zs.phase) {
          case 'IDLE':
            // gentle drift ±3% of capacity
            delta = (Math.random() - 0.5) * cap * 0.06
            flowRate = 20 + Math.random() * 15
            break
          case 'BUILDING':
            // +3–7% of capacity per tick (steady climb)
            delta = cap * (0.03 + Math.random() * 0.04)
            flowRate = 10 + Math.random() * 12
            break
          case 'PEAK':
            // hover near 90–105% with tiny oscillation
            delta = (Math.random() - 0.4) * cap * 0.03
            flowRate = 2 + Math.random() * 5  // very low flow = bottleneck feeling
            break
          case 'RECOVERING':
            // -4–8% of capacity per tick (crowd dispersing)
            delta = -(cap * (0.04 + Math.random() * 0.04))
            flowRate = 15 + Math.random() * 20
            break
        }

        // Clamp to [0, 110% capacity]
        let newDensity = Math.max(0, Math.min(cap * 1.1, zs.density + delta))

        // Enforce phase-appropriate density floors/ceilings
        if (zs.phase === 'PEAK')       newDensity = Math.max(newDensity, cap * 0.85)
        if (zs.phase === 'IDLE')       newDensity = Math.min(newDensity, cap * 0.65)
        if (zs.phase === 'RECOVERING') newDensity = Math.min(newDensity, cap * 0.80)

        zs.density = newDensity
        const pct = cap > 0 ? (newDensity / cap) * 100 : 0

        // ── Risk classification ──
        let riskScore  = Math.min(100, Math.round(pct))
        let riskType   = 'NORMAL'
        let colorState = 'GREEN'

        if (pct >= 90) {
          riskType   = zs.phase === 'PEAK' ? 'STAMPEDE_RISK' : 'SURGE'
          riskScore  = Math.max(88, riskScore)
          colorState = 'RED'
        } else if (pct >= 70) {
          riskType   = 'BOTTLENECK'
          riskScore  = Math.max(65, riskScore)
          colorState = 'YELLOW'
        } else if (pct >= 55) {
          riskType   = 'SLOW_BUILD'
          riskScore  = Math.max(45, riskScore)
          colorState = 'YELLOW'
        }

        // During RECOVERING — always soften risk presentation so it visually drops
        if (zs.phase === 'RECOVERING') {
          colorState = pct >= 75 ? 'YELLOW' : 'GREEN'
          riskType   = pct >= 75 ? 'SLOW_BUILD' : 'NORMAL'
          riskScore  = Math.min(riskScore, 72)
        }

        readings.push({
          event_id: event.id, zone_id: z.id,
          density: Math.round(newDensity),
          flow_rate: Math.round(flowRate * 10) / 10,
          risk_score: riskScore, risk_type: riskType, color_state: colorState,
        })

        // ── Alerts: only at PEAK, only if NO open TRIGGERED alert for this zone ──
        if (zs.phase === 'PEAK' && pct >= 88) {
          const alreadyTriggered = alertsRef.current.some(
            a => a.zone_id === z.id && a.status === 'TRIGGERED'
          )
          if (!alreadyTriggered && Math.random() < 0.55) {
            newAlerts.push({
              event_id: event.id, zone_id: z.id,
              risk_type: riskType, risk_score: riskScore,
              priority: pct >= 98 ? 'CRITICAL' : 'HIGH',
              message: `🚨 Zone ${z.label} at ${Math.round(pct)}% capacity — ${riskType.replace(/_/g, ' ')} detected!`,
              recommended_action: 'Open overflow gates and dispatch stewards immediately.',
              status: 'TRIGGERED',
            })
          }
        }

        // ── Steward updates — occasional, phase-appropriate ──
        if (Math.random() < 0.18) {
          const msgs = STEWARD_MESSAGES[zs.phase]
          const pick = msgs[Math.floor(Math.random() * msgs.length)]
          stewardInserts.push({
            event_id: event.id, zone_id: z.id,
            staff_id: event.admin_id,
            status: pick.status,
            message: `[Zone ${z.label}] ${pick.msg}`,
          })
        }
      }

      // ── Batch-write readings ──
      if (readings.length > 0) {
        await supabase.from('zone_readings').insert(readings)
      }

      // ── Insert new alerts with a small stagger ──
      for (const alert of newAlerts) {
        await supabase.from('alerts').insert(alert)
        await new Promise(r => setTimeout(r, 250))
      }

      // ── Insert at most 1 steward update per tick to avoid noise ──
      if (stewardInserts.length > 0) {
        const pick = stewardInserts[Math.floor(Math.random() * stewardInserts.length)]
        await supabase.from('steward_updates').insert(pick)
      }

    }, 2000)

    return () => clearInterval(interval)
  }, [isSimulating, activeEvent?.id, zones.length > 0])

  return null
}

function App() {
  const { initialize, isLoading } = useAuthStore()
  // Only show splash on first-ever visit — skip for returning/logged-in users
  const hasSession = !!(
    localStorage.getItem('sb-' + (import.meta.env.VITE_SUPABASE_URL || '').replace(/https?:\/\//, '').split('.')[0] + '-auth-token') ||
    localStorage.getItem('suraksha_pin_session')
  )
  const [showSplash, setShowSplash] = useState(!hasSession)

  useEffect(() => {
    initialize()
    if (!hasSession) {
      const timer = setTimeout(() => setShowSplash(false), 1500)
      return () => clearTimeout(timer)
    }
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
      <Route path="/dashboard" element={<Navigate to="/manager" replace />} />
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
