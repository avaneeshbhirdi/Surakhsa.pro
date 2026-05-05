/* ============================================
   Suraksha.pro — TypeScript Type Definitions
   ============================================ */

// ---- User & Profile ----
export type UserRole = 'ADMIN' | 'COORDINATOR' | 'STEWARD'

export interface Profile {
  id: string
  auth_user_id: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ---- Events ----
export type EventStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED'

export interface Event {
  id: string
  admin_id: string
  name: string
  venue_name: string | null
  event_date: string | null
  status: EventStatus
  pin: string
  pin_hash: string | null
  total_capacity: number
  created_at: string
  updated_at: string
}

// ---- Zones ----
export type ColorState = 'GREEN' | 'YELLOW' | 'RED'

export interface Zone {
  id: string
  event_id: string
  label: string
  name: string | null
  capacity: number
  created_at: string
  // Computed/live fields (not in DB, attached at runtime)
  current_density?: number
  current_flow_rate?: number
  current_risk_score?: number
  current_risk_type?: RiskType
  current_color_state?: ColorState
  active_alert_count?: number
}

// ---- Zone Readings (Time-Series) ----
export type RiskType = 'NORMAL' | 'SURGE' | 'BOTTLENECK' | 'STAMPEDE_RISK' | 'SLOW_BUILD'
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH'

export interface ZoneReading {
  id: string
  zone_id: string
  event_id: string
  density: number
  flow_rate: number
  risk_score: number
  risk_type: RiskType
  confidence: Confidence
  color_state: ColorState
  recorded_at: string
}

// ---- Alerts ----
export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type AlertStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED'

export interface Alert {
  id: string
  event_id: string
  zone_id: string
  risk_type: string
  risk_score: number
  priority: AlertPriority
  message: string
  recommended_action: string | null
  status: AlertStatus
  acknowledged_by: string | null
  triggered_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  // Joined fields
  zone?: Zone
}

// ---- Event Staff ----
export interface EventStaff {
  id: string
  event_id: string
  profile_id: string | null
  display_name: string
  role: UserRole
  zone_id: string | null
  session_token: string | null
  is_online: boolean
  joined_at: string
  left_at: string | null
  // Joined
  zone?: Zone
}

// ---- Steward Updates ----
export type StewardStatus = 'ALL_CLEAR' | 'CROWD_BUILDING' | 'EMERGENCY'

export interface StewardUpdate {
  id: string
  event_id: string
  zone_id: string
  staff_id: string
  status: StewardStatus
  created_at: string
  // Joined
  staff?: EventStaff
  zone?: Zone
}

// ---- Instructions ----
export interface Instruction {
  id: string
  event_id: string
  zone_id: string | null
  sender_id: string
  message: string
  is_broadcast: boolean
  created_at: string
  // Joined
  sender?: EventStaff
}

// ---- Admin Panel ----
export interface AdminAccount {
  id: string
  email: string
  password_hash: string
  is_active: boolean
  created_at: string
}

export interface AdminAuditLog {
  id: string
  admin_id: string
  action: string
  target_table: string | null
  target_id: string | null
  details: Record<string, unknown>
  created_at: string
}

// ---- Risk Engine ----
export interface RiskAssessment {
  zone_id: string
  timestamp: string
  density: number
  capacity: number
  flow_rate: number
  risk_score: number
  risk_type: RiskType
  confidence: Confidence
  recommended_action: string
  color_state: ColorState
}

// ---- WebRTC / PTT ----
export type PTTState = 'IDLE' | 'REQUESTING' | 'TRANSMITTING' | 'BUSY'

export interface PTTChannel {
  id: string
  name: string
  type: 'GLOBAL' | 'ZONE'
  zone_id?: string
  active_speaker?: string
  is_busy: boolean
}

// ---- Simulation ----
export type SimulationScenario = 'NORMAL' | 'BUILDING' | 'SURGE' | 'BOTTLENECK' | 'RECOVERY'
