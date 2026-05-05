import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import { Plus, MapPin, AlertTriangle } from 'lucide-react'

export default function ManagerZones() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { activeEvent, zones, latestReadings, alerts, createZone, loadEvent } = useEventStore()
  
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newZoneLabel, setNewZoneLabel] = useState('')
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneCapacity, setNewZoneCapacity] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const loadActiveEvent = async () => {
      if (!profile) { setLoading(false); return }
      // If event already loaded in store, skip
      if (activeEvent) { setLoading(false); return }
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('admin_id', profile.id)
        .in('status', ['ACTIVE', 'PAUSED', 'DRAFT'])
        .order('created_at', { ascending: false })
        .limit(1)

      if (events && events.length > 0) {
        await loadEvent(events[0].id)
      }
      setLoading(false)
    }
    loadActiveEvent()
  }, [profile])

  if (loading) {
    return (
      <div className="virtus-layout">
        <ManagerSidebar />
        <main className="virtus-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner spinner-lg" />
        </main>
      </div>
    )
  }

  if (!activeEvent) {
    return (
      <div className="virtus-layout">
        <ManagerSidebar />
        <main className="virtus-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 className="v-text-title" style={{ fontSize: '24px' }}>No Active Event</h2>
            <p className="text-secondary mb-6">Create an event to get started with crowd monitoring.</p>
            <button className="btn btn-gold btn-lg" onClick={() => navigate('/event/create')} style={{ background: 'var(--v-orange)', color: '#fff', border: 'none' }}>
              <Plus size={18} /> Create Event
            </button>
          </div>
        </main>
      </div>
    )
  }

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newZoneLabel.trim() || !newZoneCapacity) return
    
    setCreating(true)
    try {
      await createZone(activeEvent.id, newZoneLabel.trim(), newZoneName.trim() || null, parseInt(newZoneCapacity, 10))
      setShowCreateModal(false)
      setNewZoneLabel('')
      setNewZoneName('')
      setNewZoneCapacity('')
    } catch (err: any) {
      alert(err.message || 'Failed to create zone')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="virtus-layout">
      <ManagerSidebar />

      <main className="virtus-main">
        {/* Header */}
        <header className="virtus-header">
          <div style={{ display: 'flex', gap: '8px', marginRight: 'auto', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>{activeEvent.name} — Zones</span>
            {activeEvent.status === 'ACTIVE' && (
              <span className="live-indicator" style={{ marginLeft: '8px' }}><span className="live-indicator__dot" /> LIVE</span>
            )}
          </div>
          <button className="virtus-pill" onClick={() => setShowCreateModal(true)} style={{ color: 'var(--v-orange)', borderColor: 'var(--v-orange)' }}>
            <Plus size={14} /> Create Zone
          </button>
        </header>

        {/* Zones Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {zones.map(z => {
            const reading = latestReadings[z.id]
            const density = reading?.density || 0
            const pct = z.capacity > 0 ? Math.min(100, Math.round((density / z.capacity) * 100)) : 0
            const zoneAlerts = alerts.filter(a => a.zone_id === z.id && a.status === 'TRIGGERED').length
            
            let color = 'var(--v-orange)'
            if (reading?.color_state === 'RED') color = 'var(--v-red)'
            else if (reading?.color_state === 'YELLOW') color = 'orange'
            else if (reading?.color_state === 'GREEN') color = '#4dff4d'

            return (
              <div key={z.id} className="v-card" style={{ padding: '24px', border: '1px solid var(--v-border)' }}>
                <div className="flex flex-between mb-4">
                  <h3 className="v-text-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} color={color} /> {z.label} {z.name ? `- ${z.name}` : ''}
                  </h3>
                  {zoneAlerts > 0 && (
                    <span className="v-status-pill danger" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} /> {zoneAlerts} Active
                    </span>
                  )}
                </div>

                <div className="flex flex-between mb-2">
                  <span className="v-text-sm">Occupancy</span>
                  <span style={{ fontWeight: 600, color }}>{pct}%</span>
                </div>
                
                <div className="v-progress-track mb-6">
                  <div className="v-progress-fill" style={{ width: `${pct}%`, background: color }} />
                </div>

                <div className="grid grid-2 gap-4" style={{ background: 'var(--v-bg-dark)', padding: '16px', borderRadius: '12px', border: '1px solid var(--v-border)' }}>
                  <div>
                    <div className="v-text-sm mb-1">Current Crowd</div>
                    <div className="v-text-huge" style={{ fontSize: '24px' }}>{density}</div>
                  </div>
                  <div>
                    <div className="v-text-sm mb-1">Max Capacity</div>
                    <div className="v-text-huge" style={{ fontSize: '24px', color: 'var(--v-text-muted)' }}>{z.capacity}</div>
                  </div>
                </div>
              </div>
            )
          })}
          
          {zones.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', border: '1px dashed var(--v-border)', borderRadius: '20px' }}>
              <MapPin size={48} color="var(--v-text-muted)" style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              <h3 className="v-text-title">No Zones Created</h3>
              <p className="v-text-sm mb-4">Create your first zone to start monitoring specific areas.</p>
              <button className="btn" onClick={() => setShowCreateModal(true)} style={{ background: 'var(--v-orange)', color: '#fff', border: 'none' }}>
                Create Zone
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Create Zone Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--v-card-bg)', border: '1px solid var(--v-border)', borderRadius: '24px', maxWidth: '400px' }}>
            <div className="modal__header" style={{ borderBottom: '1px solid var(--v-border)' }}>
              <h2 className="modal__title">Create New Zone</h2>
            </div>
            <form onSubmit={handleCreateZone}>
              <div className="modal__body flex flex-col gap-4">
                <div className="input-group">
                  <label className="v-text-sm mb-1 block">Zone Label (e.g., A, B, North Gate)</label>
                  <input
                    type="text"
                    className="input"
                    value={newZoneLabel}
                    onChange={e => setNewZoneLabel(e.target.value)}
                    placeholder="Label"
                    required
                    style={{ background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)' }}
                  />
                </div>
                <div className="input-group">
                  <label className="v-text-sm mb-1 block">Zone Name (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    value={newZoneName}
                    onChange={e => setNewZoneName(e.target.value)}
                    placeholder="Main Stage"
                    style={{ background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)' }}
                  />
                </div>
                <div className="input-group">
                  <label className="v-text-sm mb-1 block">Maximum Capacity</label>
                  <input
                    type="number"
                    className="input"
                    value={newZoneCapacity}
                    onChange={e => setNewZoneCapacity(e.target.value)}
                    placeholder="e.g., 500"
                    required
                    min="1"
                    style={{ background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)' }}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn" style={{ background: 'transparent' }} onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancel
                </button>
                <button type="submit" className="btn" style={{ background: 'var(--v-orange)', color: 'white', border: 'none' }} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
