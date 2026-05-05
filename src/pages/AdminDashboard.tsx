import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ZoneCard from '@/components/ZoneCard'
import ZoneDetailModal from '@/components/ZoneDetailModal'
import MetricsPanel from '@/components/MetricsPanel'
import AlertFeed from '@/components/AlertFeed'
import CommunicationPanel from '@/components/CommunicationPanel'
import type { Zone } from '@/lib/types'
import { Play, Pause, Square, Plus } from 'lucide-react'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const {
    activeEvent, zones, alerts, staff, latestReadings,
    loadEvent, updateEventStatus, acknowledgeAlert, resolveAlert,
    sendInstruction, clearEvent,
  } = useEventStore()

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActiveEvent()
    return () => clearEvent()
  }, [])

  const loadActiveEvent = async () => {
    if (!profile) { setLoading(false); return }
    // Find admin's active or most recent event
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

  const handleStartEvent = async () => {
    if (!activeEvent) return
    await updateEventStatus(activeEvent.id, 'ACTIVE')
  }

  const handlePauseEvent = async () => {
    if (!activeEvent) return
    await updateEventStatus(activeEvent.id, activeEvent.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED')
  }

  const handleEndEvent = async () => {
    if (!activeEvent) return
    await updateEventStatus(activeEvent.id, 'ENDED')
    setShowEndConfirm(false)
    clearEvent()
    navigate('/event/history')
  }

  const handleAcknowledge = async (alertId: string) => {
    if (!profile) return
    await acknowledgeAlert(alertId, profile.id)
  }

  const handleSendInstruction = async (zoneId: string | null, message: string) => {
    if (!activeEvent || !profile) return
    const staffRecord = staff.find(s => s.profile_id === profile.id)
    if (staffRecord) {
      await sendInstruction(activeEvent.id, zoneId, staffRecord.id, message, !zoneId)
    }
  }

  if (loading) {
    return <div className="page"><Navbar /><div className="page-centered"><div className="spinner spinner-lg" /></div></div>
  }

  if (!activeEvent) {
    return (
      <div className="page">
        <Navbar />
        <div className="page-centered">
          <h2 className="heading-display" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>No Active Event</h2>
          <p className="text-secondary mb-6">Create an event to get started with crowd monitoring.</p>
          <button className="btn btn-gold btn-lg" onClick={() => navigate('/event/create')}>
            <Plus size={18} /> Create Event
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Navbar />

      {/* Event Header Bar */}
      <div className="dashboard-header">
        <div className="flex gap-3" style={{ alignItems: 'center' }}>
          <h2 style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)' }}>{activeEvent.name}</h2>
          {activeEvent.status === 'ACTIVE' && (
            <span className="live-indicator"><span className="live-indicator__dot" /> LIVE</span>
          )}
          {activeEvent.status === 'PAUSED' && <span className="badge badge-warning">PAUSED</span>}
          {activeEvent.status === 'DRAFT' && <span className="badge badge-info">DRAFT</span>}
        </div>
        <div className="flex gap-2">
          <span className="text-secondary hide-on-mobile" style={{ fontSize: 'var(--text-sm)', alignSelf: 'center' }}>
            PIN: {activeEvent.pin}
          </span>
          {activeEvent.status === 'DRAFT' && (
            <button className="btn btn-gold btn-sm" onClick={handleStartEvent}><Play size={14} /> Start</button>
          )}
          {activeEvent.status === 'ACTIVE' && (
            <button className="btn btn-outline btn-sm" onClick={handlePauseEvent}><Pause size={14} /> Pause</button>
          )}
          {activeEvent.status === 'PAUSED' && (
            <button className="btn btn-gold btn-sm" onClick={handlePauseEvent}><Play size={14} /> Resume</button>
          )}
          {activeEvent.status !== 'DRAFT' && (
            <button className="btn btn-danger btn-sm" onClick={() => setShowEndConfirm(true)}><Square size={14} /> End</button>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="admin-dashboard-content">
        {/* Metrics */}
        <div className="dashboard-metrics">
          <MetricsPanel zones={zones} latestReadings={latestReadings} alerts={alerts} staff={staff} />
        </div>

        {/* Zone Grid */}
        <div className="dashboard-zones">
          <h3 className="heading-section mb-4" style={{ fontSize: 'var(--text-base)' }}>Live Zone Map</h3>
          <div className="dashboard-zone-grid">
            {zones.map(zone => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                reading={latestReadings[zone.id]}
                onClick={() => setSelectedZone(zone)}
              />
            ))}
          </div>
        </div>

        {/* Alert Feed */}
        <div className="dashboard-alerts">
          <AlertFeed
            alerts={alerts}
            onAcknowledge={handleAcknowledge}
            onResolve={(id) => resolveAlert(id)}
          />
        </div>

        {/* Communication Panel */}
        <div className="dashboard-comms">
          <CommunicationPanel zones={zones} onSendInstruction={handleSendInstruction} />
        </div>
      </div>

      {/* Zone Detail Modal */}
      {selectedZone && (
        <ZoneDetailModal
          zone={selectedZone}
          reading={latestReadings[selectedZone.id]}
          onClose={() => setSelectedZone(null)}
        />
      )}

      {/* End Event Confirmation */}
      {showEndConfirm && (
        <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal__header">
              <h2 className="modal__title">End Event?</h2>
            </div>
            <div className="modal__body">
              <p className="text-secondary">This will end monitoring, disconnect all staff, and archive the event data. This action cannot be undone.</p>
            </div>
            <div className="modal__footer">
              <button className="btn btn-ghost" onClick={() => setShowEndConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleEndEvent}>End Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
