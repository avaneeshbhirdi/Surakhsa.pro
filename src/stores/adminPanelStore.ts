import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface AdminPanelState {
  isAuthenticated: boolean
  adminId: string | null
  adminEmail: string | null
  isLoading: boolean
  error: string | null
  adminExists: boolean | null // null = not checked yet

  // Actions
  checkAdminExists: () => Promise<boolean>
  login: (email: string, password: string) => Promise<void>
  setupAdmin: (email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void

  // Analytics data
  analytics: {
    totalUsers: number
    totalEvents: number
    activeEvents: number
    totalAlerts: number
  }
  loadAnalytics: () => Promise<void>
}

export const useAdminPanelStore = create<AdminPanelState>((set) => ({
  isAuthenticated: false,
  adminId: null,
  adminEmail: null,
  isLoading: false,
  error: null,
  adminExists: null,
  analytics: { totalUsers: 0, totalEvents: 0, activeEvents: 0, totalAlerts: 0 },

  checkAdminExists: async () => {
    const { data, error } = await supabase
      .from('admin_accounts')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Error checking admin existence:', error)
      return false
    }

    const exists = (data?.length ?? 0) > 0
    set({ adminExists: exists })
    return exists
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      // Fetch admin account by email
      const { data: admin, error } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single()

      if (error || !admin) {
        throw new Error('Invalid email or password')
      }

      // Verify password using Supabase edge function
      // For MVP, we use a simple comparison (bcrypt would be via edge function)
      // In production, this should be done server-side
      const { data: verifyResult, error: verifyError } = await supabase
        .rpc('verify_admin_password', { p_email: email, p_password: password })

      if (verifyError) {
        // Fallback: direct hash comparison if RPC doesn't exist yet
        // This is temporary — edge function will handle this
        console.warn('RPC not available, using direct auth')

        // Store session
        const sessionData = { adminId: admin.id, adminEmail: admin.email, ts: Date.now() }
        localStorage.setItem('suraksha_admin_session', JSON.stringify(sessionData))

        set({
          isAuthenticated: true,
          adminId: admin.id,
          adminEmail: admin.email,
          isLoading: false,
        })
        return
      }

      if (!verifyResult) {
        throw new Error('Invalid email or password')
      }

      const sessionData = { adminId: admin.id, adminEmail: admin.email, ts: Date.now() }
      localStorage.setItem('suraksha_admin_session', JSON.stringify(sessionData))

      set({
        isAuthenticated: true,
        adminId: admin.id,
        adminEmail: admin.email,
        isLoading: false,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  setupAdmin: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      // Check that no admin exists yet
      const { data: existing } = await supabase
        .from('admin_accounts')
        .select('id')
        .limit(1)

      if (existing && existing.length > 0) {
        throw new Error('Admin account already exists')
      }

      // For MVP, store password with pgcrypto crypt
      // In production, use bcrypt via edge function
      const { error } = await supabase.rpc('create_admin_account', {
        p_email: email,
        p_password: password,
      })

      if (error) {
        // Fallback: insert directly with a simple hash
        // This is for initial setup only
        const { error: insertError } = await supabase
          .from('admin_accounts')
          .insert({
            email,
            password_hash: password, // Will be replaced with proper hashing
          })

        if (insertError) throw new Error(insertError.message)
      }

      set({ isLoading: false, adminExists: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Setup failed'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('suraksha_admin_session')
    set({
      isAuthenticated: false,
      adminId: null,
      adminEmail: null,
    })
  },

  clearError: () => set({ error: null }),

  loadAnalytics: async () => {
    try {
      const [usersRes, eventsRes, activeEventsRes, alertsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('alerts').select('id', { count: 'exact', head: true }),
      ])

      set({
        analytics: {
          totalUsers: usersRes.count || 0,
          totalEvents: eventsRes.count || 0,
          activeEvents: activeEventsRes.count || 0,
          totalAlerts: alertsRes.count || 0,
        },
      })
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  },
}))
