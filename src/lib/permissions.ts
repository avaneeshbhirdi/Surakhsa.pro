/**
 * Suraksha.pro — Central Permission Helper
 * 
 * Use can(role, action) anywhere in the app to check if a role
 * is allowed to perform a given action. This is the frontend
 * equivalent of backend middleware for RBAC.
 */

import type { UserRole } from './types'

type Action =
  // Event actions
  | 'create:event'
  | 'edit:event'
  | 'delete:event'
  | 'end:event'
  | 'view:event_history'
  // Alert actions
  | 'send:alert'
  | 'acknowledge:alert'
  | 'resolve:alert'
  | 'view:alerts'
  // Coordinator actions
  | 'send:status_update'
  | 'view:own_zone'
  | 'view:all_zones'
  // Emergency actions (Guest-only allowed)
  | 'use:emergency_call'
  // Admin panel
  | 'access:admin_panel'
  | 'manage:users'
  | 'view:analytics'
  // Communication
  | 'send:instruction'
  | 'receive:instruction'

const PERMISSIONS: Record<UserRole, Action[]> = {
  ADMIN: [
    'create:event', 'edit:event', 'delete:event', 'end:event', 'view:event_history',
    'send:alert', 'acknowledge:alert', 'resolve:alert', 'view:alerts',
    'send:status_update', 'view:own_zone', 'view:all_zones',
    'use:emergency_call',
    'access:admin_panel', 'manage:users', 'view:analytics',
    'send:instruction', 'receive:instruction',
  ],
  EVENT_MANAGER: [
    'create:event', 'edit:event', 'end:event', 'view:event_history',
    'send:alert', 'acknowledge:alert', 'resolve:alert', 'view:alerts',
    'view:all_zones',
    'use:emergency_call',
    'send:instruction', 'receive:instruction',
  ],
  COORDINATOR: [
    'view:alerts', 'acknowledge:alert',
    'send:status_update', 'view:own_zone',
    'use:emergency_call',
    'receive:instruction',
  ],
  GUEST: [
    'view:alerts',
    'use:emergency_call',
  ],
}

/**
 * Check if a role can perform an action.
 * Returns false for null/undefined roles.
 */
export function can(role: UserRole | null | undefined, action: Action): boolean {
  if (!role) return false
  return PERMISSIONS[role]?.includes(action) ?? false
}

/**
 * Check if a role has ALL of the given actions.
 */
export function canAll(role: UserRole | null | undefined, actions: Action[]): boolean {
  return actions.every(action => can(role, action))
}

/**
 * Check if a role has ANY of the given actions.
 */
export function canAny(role: UserRole | null | undefined, actions: Action[]): boolean {
  return actions.some(action => can(role, action))
}
