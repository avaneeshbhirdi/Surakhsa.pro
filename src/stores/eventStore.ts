import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type {
  Event, Zone, ZoneReading, Alert, EventStaff,
  StewardUpdate, Instruction, EventStatus
} from '@/lib/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface EventState {
  // State
  activeEvent: Event | null
  zones: Zone[]
  alerts: Alert[]
  staff: EventStaff[]
  latestReadings: Record<string, ZoneReading> // keyed by zone_id
  stewardUpdates: StewardUpdate[]
  instructions: Instruction[]
  isLoading: boolean
  error: string | null

  // Realtime channels
  _channels: RealtimeChannel[]

  // Actions
  createEvent: (data: {
    name: string
    venue_name?: string
    event_date?: string
    total_capacity: number
    zones: { label: string; name?: string; capacity: number }[]
  }, adminProfileId: string) => Promise<Event>
  loadEvent: (eventId: string) => Promise<void>
  updateEventStatus: (eventId: string, status: EventStatus) => Promise<void>
  acknowledgeAlert: (alertId: string, profileId: string) => Promise<void>
  resolveAlert: (alertId: string) => Promise<void>
  sendInstruction: (eventId: string, zoneId: string | null, senderId: string, message: string, isBroadcast?: boolean) => Promise<void>
  subscribeToRealtime: (eventId: string) => void
  unsubscribeAll: () => void
  clearEvent: () => void
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const useEventStore = create<EventState>((set, get) => ({
  activeEvent: null,
  zones: [],
  alerts: [],
  staff: [],
  latestReadings: {},
  stewardUpdates: [],
  instructions: [],
  isLoading: false,
  error: null,
  _channels: [],

  createEvent: async (data, adminProfileId) => {
    set({ isLoading: true, error: null })
    try {
      const pin = generatePin()

      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          admin_id: adminProfileId,
          name: data.name,
          venue_name: data.venue_name || null,
          event_date: data.event_date || null,
          total_capacity: data.total_capacity,
          pin,
          status: 'DRAFT',
        })
        .select()
        .single()

      if (eventError || !event) throw new Error(eventError?.message || 'Failed to create event')

      // Create zones
      const zonesData = data.zones.map(z => ({
        event_id: event.id,
        label: z.label,
        name: z.name || null,
        capacity: z.capacity,
      }))

      const { data: zones, error: zonesError } = await supabase
        .from('zones')
        .insert(zonesData)
        .select()

      if (zonesError) throw new Error(zonesError.message)

      // Also add admin as event_staff
      await supabase.from('event_staff').insert({
        event_id: event.id,
        profile_id: adminProfileId,
        display_name: 'Admin',
        role: 'ADMIN',
      })

      set({
        activeEvent: event,
        zones: zones || [],
        isLoading: false,
      })

      return event
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create event'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  loadEvent: async (eventId: string) => {
    set({ isLoading: true, error: null })
    try {
      const [eventRes, zonesRes, alertsRes, staffRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('zones').select('*').eq('event_id', eventId).order('label'),
        supabase.from('alerts').select('*').eq('event_id', eventId).order('triggered_at', { ascending: false }).limit(100),
        supabase.from('event_staff').select('*').eq('event_id', eventId).is('left_at', null),
      ])

      if (eventRes.error) throw new Error(eventRes.error.message)

      // Load latest reading per zone
      const latestReadings: Record<string, ZoneReading> = {}
      if (zonesRes.data) {
        for (const zone of zonesRes.data) {
          const { data: readings } = await supabase
            .from('zone_readings')
            .select('*')
            .eq('zone_id', zone.id)
            .order('recorded_at', { ascending: false })
            .limit(1)
          
          if (readings && readings.length > 0) {
            latestReadings[zone.id] = readings[0]
          }
        }
      }

      set({
        activeEvent: eventRes.data,
        zones: zonesRes.data || [],
        alerts: alertsRes.data || [],
        staff: staffRes.data || [],
        latestReadings,
        isLoading: false,
      })

      // Subscribe to realtime
      get().subscribeToRealtime(eventId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load event'
      set({ isLoading: false, error: message })
    }
  },

  updateEventStatus: async (eventId: string, status: EventStatus) => {
    const { error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', eventId)

    if (error) throw new Error(error.message)
    set(state => ({
      activeEvent: state.activeEvent ? { ...state.activeEvent, status } : null,
    }))
  },

  acknowledgeAlert: async (alertId: string, profileId: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'ACKNOWLEDGED',
        acknowledged_by: profileId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)

    if (error) throw new Error(error.message)
    set(state => ({
      alerts: state.alerts.map(a =>
        a.id === alertId
          ? { ...a, status: 'ACKNOWLEDGED' as const, acknowledged_by: profileId, acknowledged_at: new Date().toISOString() }
          : a
      ),
    }))
  },

  resolveAlert: async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'RESOLVED',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId)

    if (error) throw new Error(error.message)
    set(state => ({
      alerts: state.alerts.map(a =>
        a.id === alertId
          ? { ...a, status: 'RESOLVED' as const, resolved_at: new Date().toISOString() }
          : a
      ),
    }))
  },

  sendInstruction: async (eventId, zoneId, senderId, message, isBroadcast = false) => {
    const { error } = await supabase.from('instructions').insert({
      event_id: eventId,
      zone_id: zoneId,
      sender_id: senderId,
      message,
      is_broadcast: isBroadcast,
    })
    if (error) throw new Error(error.message)
  },

  subscribeToRealtime: (eventId: string) => {
    get().unsubscribeAll()

    const channels: RealtimeChannel[] = []

    // Zone readings channel
    const readingsChannel = supabase
      .channel(`event:${eventId}:readings`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'zone_readings',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        const reading = payload.new as ZoneReading
        set(state => ({
          latestReadings: { ...state.latestReadings, [reading.zone_id]: reading },
        }))
      })
      .subscribe()
    channels.push(readingsChannel)

    // Alerts channel
    const alertsChannel = supabase
      .channel(`event:${eventId}:alerts`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        set(state => ({
          alerts: [payload.new as Alert, ...state.alerts],
        }))
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'alerts',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        const updated = payload.new as Alert
        set(state => ({
          alerts: state.alerts.map(a => a.id === updated.id ? updated : a),
        }))
      })
      .subscribe()
    channels.push(alertsChannel)

    // Staff channel
    const staffChannel = supabase
      .channel(`event:${eventId}:staff`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_staff',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          set(state => ({ staff: [...state.staff, payload.new as EventStaff] }))
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as EventStaff
          set(state => ({
            staff: state.staff.map(s => s.id === updated.id ? updated : s),
          }))
        }
      })
      .subscribe()
    channels.push(staffChannel)

    // Steward updates channel
    const stewardChannel = supabase
      .channel(`event:${eventId}:steward_updates`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'steward_updates',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        set(state => ({
          stewardUpdates: [payload.new as StewardUpdate, ...state.stewardUpdates],
        }))
      })
      .subscribe()
    channels.push(stewardChannel)

    // Instructions channel
    const instructionsChannel = supabase
      .channel(`event:${eventId}:instructions`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'instructions',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        set(state => ({
          instructions: [payload.new as Instruction, ...state.instructions],
        }))
      })
      .subscribe()
    channels.push(instructionsChannel)

    set({ _channels: channels })
  },

  unsubscribeAll: () => {
    const { _channels } = get()
    _channels.forEach(ch => supabase.removeChannel(ch))
    set({ _channels: [] })
  },

  clearEvent: () => {
    get().unsubscribeAll()
    set({
      activeEvent: null,
      zones: [],
      alerts: [],
      staff: [],
      latestReadings: {},
      stewardUpdates: [],
      instructions: [],
    })
  },
}))
