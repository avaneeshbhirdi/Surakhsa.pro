import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import { Plus, MapPin, AlertTriangle, Edit2, Trash2 } from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'
import RealtimeStatus from '@/components/RealtimeStatus'

export default function ManagerZones() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { activeEvent, zones, latestReadings, alerts, createZone, updateZone, deleteZone, loadEvent } = useEventStore()
  const { t } = useLang()
  
  const [loading, setLoading] = useState(!activeEvent) // skip loading if event already in store
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newZoneLabel, setNewZoneLabel] = useState('')
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneCapacity, setNewZoneCapacity] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [editZoneLabel, setEditZoneLabel] = useState('')
  const [editZoneName, setEditZoneName] = useState('')
  const [editZoneCapacity, setEditZoneCapacity] = useState('')
  const [updating, setUpdating] = useState(false)

  const [deletingZone, setDeletingZone] = useState<{ id: string; label: string; name?: string } | null>(null)
  const [deleteConfirming, setDeleteConfirming] = useState(false)

  useEffect(() => {
    // If event already in store, no loading needed
    if (activeEvent) { setLoading(false); return }
    if (!profile) { setLoading(false); return }
    const loadActiveEvent = async () => {
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
  }, [profile?.id, activeEvent?.id])

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
            <h2 className="v-text-title" style={{ fontSize: '24px' }}>{t('mgrNoEvent')}</h2>
            <p className="text-secondary mb-6">{t('mgrCreateEvent')}</p>
            <button className="btn btn-gold btn-lg" onClick={() => navigate('/event/create')} style={{ background: 'var(--v-orange)', color: '#fff', border: 'none' }}>
              <Plus size={18} /> {t('mgrCreateBtn')}
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

  const handleEditClick = (z: any) => {
    setEditingZoneId(z.id)
    setEditZoneLabel(z.label)
    setEditZoneName(z.name || '')
    setEditZoneCapacity(z.capacity.toString())
  }

  const handleUpdateZone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingZoneId || !editZoneLabel.trim() || !editZoneCapacity) return
    
    setUpdating(true)
    try {
      await updateZone(editingZoneId, editZoneLabel.trim(), editZoneName.trim() || null, parseInt(editZoneCapacity, 10))
      setEditingZoneId(null)
    } catch (err: any) {
      alert(err.message || 'Failed to update zone')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteZone = async () => {
    if (!deletingZone) return
    setDeleteConfirming(true)
    try {
      await deleteZone(deletingZone.id)
      setDeletingZone(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete zone')
    } finally {
      setDeleteConfirming(false)
    }
  }

  return (
    <div className="virtus-layout">
      <ManagerSidebar />

      <main className="virtus-main">
        {/* Header */}
        <header className="virtus-header">
          <div style={{ display: 'flex', gap: '8px', marginRight: 'auto', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>{activeEvent.name} — {t('mgrZonesHeader')}</span>
            {activeEvent.status === 'ACTIVE' && (
              <span className="live-indicator" style={{ marginLeft: '8px' }}><span className="live-indicator__dot" /> {t('live')}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <RealtimeStatus />
            <button className="virtus-pill" onClick={() => setShowCreateModal(true)} style={{ color: 'var(--v-orange)', borderColor: 'var(--v-orange)' }}>
              <Plus size={14} /> {t('mgrCreateZone')}
            </button>
          </div>
        </header>

        {/* Zones Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {zones.map(z => {
            const reading = latestReadings[z.id]
            const density = reading?.density || 0
            const pct = z.capacity > 0 ? Math.min(100, Math.round((density / z.capacity) * 100)) : 0
            const zoneAlerts = alerts.filter(a => a.zone_id === z.id && a.status === 'TRIGGERED').length
            
            // Derive color from LIVE pct rather than stored color_state (which becomes stale after capacity edits)
            let color = '#4dff4d' // GREEN
            if (pct >= 85) color = 'var(--v-red)'
            else if (pct >= 60) color = 'orange'

            return (
              <div key={z.id} className="v-card" style={{ padding: '24px', border: '1px solid var(--v-border)' }}>
                <div className="flex flex-between mb-4">
                  <h3 className="v-text-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} color={color} /> {z.label} {z.name ? `- ${z.name}` : ''}
                    <button
                      onClick={() => handleEditClick(z)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--v-text-muted)', cursor: 'pointer', display: 'flex', padding: '4px', opacity: 0.7 }}
                      title="Edit Zone"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingZone({ id: z.id, label: z.label, name: z.name ?? undefined })}
                      style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', padding: '4px', opacity: 0.75, marginLeft: 'auto' }}
                      title="Delete Zone"
                    >
                      <Trash2 size={14} />
                    </button>
                  </h3>
                  {zoneAlerts > 0 && (
                    <span className="v-status-pill danger" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} /> {zoneAlerts} Active
                    </span>
                  )}
                </div>

                <div className="flex flex-between mb-2">
                  <span className="v-text-sm">{t('mgrOccupancy')}</span>
                  <span style={{ fontWeight: 600, color }}>{pct}%</span>
                </div>
                
                <div className="v-progress-track mb-6">
                  <div className="v-progress-fill" style={{ width: `${pct}%`, background: color }} />
                </div>

                <div className="grid grid-2 gap-4" style={{ background: 'var(--v-bg-dark)', padding: '16px', borderRadius: '12px', border: '1px solid var(--v-border)' }}>
                  <div>
                    <div className="v-text-sm mb-1">{t('mgrCurrentCrowd')}</div>
                    <div className="v-text-huge" style={{ fontSize: '24px' }}>{density}</div>
                  </div>
                  <div>
                    <div className="v-text-sm mb-1">{t('mgrMaxCapacity')}</div>
                    <div className="v-text-huge" style={{ fontSize: '24px', color: 'var(--v-text-muted)' }}>{z.capacity}</div>
                  </div>
                </div>
              </div>
            )
          })}
          
          {zones.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', border: '1px dashed var(--v-border)', borderRadius: '20px' }}>
              <MapPin size={48} color="var(--v-text-muted)" style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              <h3 className="v-text-title">{t('mgrNoZones')}</h3>
              <p className="v-text-sm mb-4">{t('mgrCreateFirstZone')}</p>
              <button className="btn" onClick={() => setShowCreateModal(true)} style={{ background: 'var(--v-orange)', color: '#fff', border: 'none' }}>
                {t('mgrCreateZone')}
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
              <h2 className="modal__title">{t('mgrCreateZone')}</h2>
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
                  {t('cancel')}
                </button>
                <button type="submit" className="btn" style={{ background: 'var(--v-orange)', color: 'white', border: 'none' }} disabled={creating}>
                  {creating ? t('loading') : t('mgrCreateZone')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Zone Modal */}
      {editingZoneId && (
        <div className="modal-overlay" onClick={() => !updating && setEditingZoneId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--v-card-bg)', border: '1px solid var(--v-border)', borderRadius: '24px', maxWidth: '400px' }}>
            <div className="modal__header" style={{ borderBottom: '1px solid var(--v-border)' }}>
              <h2 className="modal__title">{t('mgrEditZone')}</h2>
            </div>
            <form onSubmit={handleUpdateZone}>
              <div className="modal__body flex flex-col gap-4">
                <div className="input-group">
                  <label className="v-text-sm mb-1 block">Zone Label (e.g., A, B, North Gate)</label>
                  <input
                    type="text"
                    className="input"
                    value={editZoneLabel}
                    onChange={e => setEditZoneLabel(e.target.value)}
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
                    value={editZoneName}
                    onChange={e => setEditZoneName(e.target.value)}
                    placeholder="Main Stage"
                    style={{ background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)' }}
                  />
                </div>
                <div className="input-group">
                  <label className="v-text-sm mb-1 block">Maximum Capacity</label>
                  <input
                    type="number"
                    className="input"
                    value={editZoneCapacity}
                    onChange={e => setEditZoneCapacity(e.target.value)}
                    placeholder="e.g., 500"
                    required
                    min="1"
                    style={{ background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)' }}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn" style={{ background: 'transparent' }} onClick={() => setEditingZoneId(null)} disabled={updating}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn" style={{ background: 'var(--v-orange)', color: 'white', border: 'none' }} disabled={updating}>
                  {updating ? t('save') + '...' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Zone Confirmation Modal */}
      {deletingZone && (
        <div className="modal-overlay" onClick={() => !deleteConfirming && setDeletingZone(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--v-card-bg)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '24px', maxWidth: '400px' }}>
            <div className="modal__header" style={{ borderBottom: '1px solid var(--v-border)' }}>
              <h2 className="modal__title" style={{ color: '#ff4d4d', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trash2 size={20} /> {t('mgrDeleteZone')}
              </h2>
            </div>
            <div className="modal__body">
              <p style={{ marginBottom: '8px' }}>{t('mgrConfirmDeleteZone')}</p>
              <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px' }}>
                <strong style={{ fontSize: '18px' }}>{deletingZone.label}</strong>
                {deletingZone.name && <span style={{ color: 'var(--v-text-muted)', marginLeft: '8px' }}>— {deletingZone.name}</span>}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--v-text-muted)', lineHeight: 1.6 }}>
                ⚠️ {t('mgrDeleteWarning')}
              </p>
            </div>
            <div className="modal__footer">
              <button
                type="button" className="btn"
                style={{ background: 'transparent' }}
                onClick={() => setDeletingZone(null)}
                disabled={deleteConfirming}
              >
                {t('cancel')}
              </button>
              <button
                type="button" className="btn"
                style={{ background: '#ef4444', color: 'white', border: 'none', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}
                onClick={handleDeleteZone}
                disabled={deleteConfirming}
              >
                {deleteConfirming ? t('loading') : '🗑 ' + t('mgrDeleteZone')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
