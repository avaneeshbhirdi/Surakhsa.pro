import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/lib/types'
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
  // State
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  error: string | null

  // PIN-based session (for coordinators/stewards)
  pinSession: {
    eventId: string
    staffId: string
    role: UserRole
    zoneId: string | null
    displayName: string
    sessionToken: string
  } | null

  // Computed
  isAuthenticated: boolean
  role: UserRole | null

  // Actions
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>
  loginWithGoogle: () => Promise<void>
  joinWithPin: (pin: string, displayName: string, role: UserRole, zoneId?: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  error: null,
  pinSession: null,
  isAuthenticated: false,
  role: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single()

        set({
          user: session.user,
          session,
          profile,
          isAuthenticated: true,
          role: profile?.role || 'GUEST',
          isLoading: false,
        })
      } else {
        // Check for PIN session in localStorage
        const pinSessionStr = localStorage.getItem('suraksha_pin_session')
        if (pinSessionStr) {
          try {
            const pinSession = JSON.parse(pinSessionStr)
            set({
              pinSession,
              isAuthenticated: true,
              role: pinSession.role,
              isLoading: false,
            })
          } catch {
            localStorage.removeItem('suraksha_pin_session')
            set({ isLoading: false })
          }
        } else {
          set({ isLoading: false })
        }
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .single()

          set({
            user: session.user,
            session,
            profile,
            isAuthenticated: true,
            role: profile?.role || 'GUEST',
          })
        } else if (event === 'SIGNED_OUT') {
          set({
            user: null,
            session: null,
            profile: null,
            isAuthenticated: false,
            role: null,
          })
        }
      })
    } catch (err) {
      console.error('Auth initialization error:', err)
      set({ isLoading: false, error: 'Failed to initialize authentication' })
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      set({ isLoading: false })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  signup: async (email: string, password: string, fullName: string) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role || 'GUEST',
          },
        },
      })
      if (error) throw error
      set({ isLoading: false })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth',
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google login failed'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  joinWithPin: async (pin: string, displayName: string, role: UserRole, zoneId?: string) => {
    set({ isLoading: true, error: null })
    try {
      // Validate PIN — find event with this PIN
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, status')
        .eq('pin', pin)
        .in('status', ['ACTIVE', 'PAUSED'])
        .single()

      if (eventError || !event) {
        throw new Error('Event not found or PIN expired')
      }

      // Generate session token
      const sessionToken = crypto.randomUUID()

      // Create event_staff record
      const { data: staff, error: staffError } = await supabase
        .from('event_staff')
        .insert({
          event_id: event.id,
          display_name: displayName,
          role,
          zone_id: zoneId || null,
          session_token: sessionToken,
        })
        .select()
        .single()

      if (staffError || !staff) {
        throw new Error(staffError?.message || 'Failed to join event')
      }

      const pinSession = {
        eventId: event.id,
        staffId: staff.id,
        role,
        zoneId: zoneId || null,
        displayName,
        sessionToken,
      }

      localStorage.setItem('suraksha_pin_session', JSON.stringify(pinSession))

      set({
        pinSession,
        isAuthenticated: true,
        role,
        isLoading: false,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join event'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  logout: async () => {
    const { pinSession } = get()

    if (pinSession) {
      // Mark staff as left
      await supabase
        .from('event_staff')
        .update({ is_online: false, left_at: new Date().toISOString() })
        .eq('id', pinSession.staffId)

      localStorage.removeItem('suraksha_pin_session')
      set({
        pinSession: null,
        isAuthenticated: false,
        role: null,
      })
    } else {
      await supabase.auth.signOut()
      set({
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        role: null,
      })
    }
  },

  clearError: () => set({ error: null }),
}))
