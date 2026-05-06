import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import type { EventStaff } from '@/lib/types'
import { Plus, Copy, Check, Megaphone, Activity, Play, Pause, Square } from 'lucide-react'
import { BarChart, Bar, XAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import './ManagerDashboard.css'

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const {
    activeEvent, zones, alerts, staff, latestReadings, stewardUpdates,
    loadEvent, acknowledgeAlert, clearEvent, updateEventStatus,
  } = useEventStore()

  const [loading, setLoading] = useState(true)

  // Generate Event Code states
  const [pinCopied, setPinCopied] = useState(false)

  // Send Alert modal states
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [alertType, setAlertType] = useState<'BROADCAST' | 'ZONE'>('BROADCAST')
  const [selectedTargetZone, setSelectedTargetZone] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertPriority, setAlertPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH')
  const [alertSending, setAlertSending] = useState(false)

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false)

  // Simulation interval
  useEffect(() => {
    if (!isSimulating || !activeEvent || zones.length === 0) return
    const interval = setInterval(async () => {
      // Pick a random zone
      const z = zones[Math.floor(Math.random() * zones.length)]
      const currentReading = latestReadings[z.id]
      // current density or start at 20%
      const currentDensity = currentReading?.density || Math.floor(z.capacity * 0.2)
      
      // Fluctuate randomly (-5 to +20 people)
      const diff = Math.floor(Math.random() * 25) - 5
      const newDensity = Math.max(0, Math.min(z.capacity * 1.5, currentDensity + diff)) // max cap 150%
      
      const pct = z.capacity > 0 ? (newDensity / z.capacity) * 100 : 0
      let riskScore = Math.min(100, Math.floor(pct))
      let riskType = 'NORMAL'
      let colorState = 'GREEN'
      if (pct > 95) { riskType = 'STAMPEDE_RISK'; riskScore = Math.max(90, riskScore); colorState = 'RED' }
      else if (pct > 80) { riskType = 'BOTTLENECK'; riskScore = Math.max(75, riskScore); colorState = 'YELLOW' }
      else if (pct > 60) { riskType = 'SURGE'; riskScore = Math.max(50, riskScore); colorState = 'YELLOW' }

      await supabase.from('zone_readings').insert({
        event_id: activeEvent.id,
        zone_id: z.id,
        density: newDensity,
        flow_rate: Math.random() * 5 + 1,
        risk_score: riskScore,
        risk_type: riskType,
        color_state: colorState,
      })

      // Randomly trigger a simulated alert if density is high
      if (pct > 85 && Math.random() > 0.7) {
        await supabase.from('alerts').insert({
          event_id: activeEvent.id,
          zone_id: z.id,
          risk_type: riskType,
          risk_score: riskScore,
          priority: pct > 95 ? 'CRITICAL' : 'HIGH',
          message: `Automatic alert: High density detected in Zone ${z.label}!`,
          status: 'TRIGGERED'
        })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isSimulating, activeEvent, zones, latestReadings])

  useEffect(() => {
    // Re-run when profile becomes available (avoids race on first mount)
    if (!profile) return
    loadActiveEvent()
    // NOTE: do NOT clearEvent on unmount — we want the store to persist across navigation
  }, [profile?.id])

  const loadActiveEvent = async () => {
    if (!profile) { setLoading(false); return }

    // If event already loaded in store (e.g. navigating back), skip fetch
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

  // Copy event PIN to clipboard
  const handleCopyPin = async () => {
    if (!activeEvent) return
    await navigator.clipboard.writeText(activeEvent.pin)
    setPinCopied(true)
    setTimeout(() => setPinCopied(false), 2500)
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

  const handleDirectMessage = (s: EventStaff) => {
    setAlertType('ZONE')
    setSelectedTargetZone(s.zone_id || '')
    const zoneLabel = zones.find(z => z.id === s.zone_id)?.label || 'Global'
    setAlertMessage(`@${s.display_name} (Zone ${zoneLabel}): `)
    setShowAlertModal(true)
  }

  // Send manual broadcast alert
  const handleSendAlert = async () => {
    if (!activeEvent || !alertMessage.trim()) return
    setAlertSending(true)
    try {
      await supabase.from('alerts').insert({
        event_id: activeEvent.id,
        zone_id: alertType === 'ZONE' && selectedTargetZone ? selectedTargetZone : null,
        risk_type: 'NORMAL',
        risk_score: alertPriority === 'CRITICAL' ? 90 : alertPriority === 'HIGH' ? 70 : 40,
        priority: alertPriority,
        message: alertMessage.trim(),
        recommended_action: 'Follow manager instructions.',
        status: 'TRIGGERED',
      })
      setAlertMessage('')
      setTimeout(() => {
        setShowAlertModal(false)
      }, 500)
    } catch (err) {
      console.error('Failed to send alert', err)
    } finally {
      setAlertSending(false)
    }
  }

  // Compute aggregated data
  const totalPeople = Object.values(latestReadings).reduce((acc, r) => acc + (r.density || 0), 0)
  const totalCapacity = zones.reduce((acc, z) => acc + z.capacity, 0)
  const totalDensityPct = totalCapacity > 0 ? Math.round((totalPeople / totalCapacity) * 100) : 0
  const activeAlertsCount = alerts.filter(a => a.status === 'TRIGGERED').length

  const chartData = useMemo(() => {
    if (!zones || zones.length === 0) return []
    return zones.map(z => {
      const reading = latestReadings[z.id]
      const currentPeople = reading?.density || 0
      const densityPct = z.capacity > 0 ? Math.round((currentPeople / z.capacity) * 100) : 0
      
      return {
        name: z.label,
        density: densityPct,
        people: currentPeople,
      }
    })
  }, [zones, latestReadings])

  if (loading) {
    // Skeleton layout — keeps structure visible while data loads
    return (
      <div className="virtus-layout">
        <ManagerSidebar />
        <main className="virtus-main">
          <header className="virtus-header">
            <div style={{ width: '160px', height: '20px', borderRadius: '8px', background: 'var(--v-border)', opacity: 0.4 }} />
          </header>
          <div className="virtus-grid">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="v-card" style={{ minHeight: '120px', background: 'var(--v-card-bg)', animation: 'pulse 1.5s ease-in-out infinite' }}>
                <div style={{ width: '40%', height: '14px', borderRadius: '6px', background: 'var(--v-border)', marginBottom: '16px' }} />
                <div style={{ width: '60%', height: '32px', borderRadius: '6px', background: 'var(--v-border)' }} />
              </div>
            ))}
          </div>
        </main>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
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
            <div className="flex gap-3" style={{ justifyContent: 'center' }}>
              <button className="btn btn-gold btn-lg" onClick={() => navigate('/event/create')} style={{ background: 'var(--v-orange)', color: '#fff', border: 'none' }}>
                <Plus size={18} /> Create Event
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="virtus-layout">
      <ManagerSidebar />

      <main className="virtus-main">
        {/* Header */}
        <header className="virtus-header">
          <div style={{ display: 'flex', gap: '8px', marginRight: 'auto', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>{activeEvent.name}</span>
            {activeEvent.status === 'ACTIVE' && (
              <span className="live-indicator" style={{ marginLeft: '8px' }}><span className="live-indicator__dot" /> LIVE</span>
            )}
            {activeEvent.status === 'PAUSED' && <span className="v-status-pill warning" style={{ marginLeft: '8px' }}>PAUSED</span>}
            {activeEvent.status === 'DRAFT' && <span className="v-status-pill" style={{ marginLeft: '8px' }}>DRAFT</span>}
            <button className="virtus-pill" onClick={handleCopyPin} style={{ marginLeft: '12px' }}>
              {pinCopied ? <Check size={14} color="#4dff4d" /> : <Copy size={14} />} PIN: {activeEvent.pin}
            </button>
          </div>
          
          {/* Status Controls */}
          {activeEvent.status === 'DRAFT' && (
            <button className="virtus-pill" onClick={handleStartEvent} style={{ color: 'var(--v-orange)', borderColor: 'var(--v-orange)' }}>
              <Play size={14} /> Start Event
            </button>
          )}
          {activeEvent.status === 'ACTIVE' && (
            <button className="virtus-pill" onClick={handlePauseEvent}>
              <Pause size={14} /> Pause
            </button>
          )}
          {activeEvent.status === 'PAUSED' && (
            <button className="virtus-pill" onClick={handlePauseEvent} style={{ color: 'var(--v-orange)', borderColor: 'var(--v-orange)' }}>
              <Play size={14} /> Resume
            </button>
          )}
          {activeEvent.status !== 'DRAFT' && (
            <button className="virtus-pill" onClick={() => setShowEndConfirm(true)} style={{ color: 'var(--v-red)', borderColor: 'var(--v-red)' }}>
              <Square size={14} /> End Event
            </button>
          )}

          <button className={`simulator-toggle ${isSimulating ? 'active' : 'inactive'}`} onClick={() => setIsSimulating(!isSimulating)}>
            <Activity size={14} /> {isSimulating ? 'Simulating...' : 'Simulate Data'}
          </button>
          <button className="virtus-pill" onClick={() => setShowAlertModal(true)}>
            <Megaphone size={14} /> Send Alert
          </button>
          <div className="v-avatar">
            {profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'M'}
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="virtus-grid">
          
          {/* Row 1: Task progress (Overall Density) */}
          <div className="v-card v-task-progress">
            <h3 className="v-text-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Total Crowd <span style={{ color: 'var(--v-text-muted)' }}>Live</span>
            </h3>
            <div className="v-text-huge mb-2">{totalDensityPct}%</div>
            <div className="v-text-sm mb-4">{new Date().toLocaleDateString()}</div>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', width: '100%', borderRadius: '12px' }}>
              {totalPeople} / {totalCapacity} people
            </button>
          </div>

          {/* Row 1: Today task (Active Alerts) */}
          <div className="v-card v-today-task orange" style={{ cursor: 'pointer' }} onClick={() => navigate('/event/history')}>
            <h3 className="v-text-title" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              Active Alerts <span style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>High</span>
            </h3>
            <div className="v-text-huge mb-4">{activeAlertsCount}</div>
            <div className="v-progress-track" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="v-progress-fill" style={{ width: `${Math.min(100, activeAlertsCount * 10)}%`, background: '#fff' }} />
            </div>
            <div className="v-text-sm mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Needs attention</div>
          </div>

          {/* Row 1: Room Density (Bar Chart) */}
          <div className="v-card v-performance">
            <h3 className="v-text-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Room Density (%) <div className="flex gap-4">
                <span style={{ fontSize: '12px', color: 'var(--v-orange)' }}>● Current</span>
              </div>
            </h3>
            <div style={{ display: 'flex', gap: '32px', marginBottom: '16px' }}>
              <div><span className="v-text-huge" style={{ fontSize: '32px' }}>{totalDensityPct}%</span> <span className="v-text-sm">Overall Avg</span></div>
            </div>
            <div style={{ height: '160px', width: '100%', marginLeft: '-20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={10} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--v-card-bg)', border: '1px solid var(--v-border)', borderRadius: '8px', color: 'var(--v-text-main)' }} />
                  <Bar dataKey="density" fill="var(--v-orange)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Zone Capacities (Main Goal) */}
          <div className="v-card v-zone-capacities">
            <div className="flex flex-between mb-4">
              <h3 className="v-text-title" style={{ margin: 0 }}>Zone Occupancy</h3>
              <button className="btn-icon" onClick={() => navigate('/manager/zones')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '6px', borderRadius: '8px', cursor: 'pointer', color: 'var(--v-text-main)' }}>
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {zones.slice(0, 3).map(z => {
                const reading = latestReadings[z.id]
                const d = reading?.density || 0
                const pct = z.capacity > 0 ? Math.min(100, Math.round((d / z.capacity) * 100)) : 0
                return (
                  <div key={z.id}>
                    <div className="flex flex-between mb-1" style={{ fontSize: '13px' }}>
                      <span>{z.label} {z.name ? `- ${z.name}` : ''}</span>
                      <span style={{ fontWeight: 'bold' }}>{pct}%</span>
                    </div>
                    <div className="v-progress-track">
                      <div className="v-progress-fill" style={{ 
                        width: `${pct}%`, 
                        background: pct >= 85 ? '#ff4d4d' : pct >= 60 ? 'orange' : 'var(--v-orange)',
                        transition: 'width 0.6s ease, background 0.4s ease'
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <button className="btn mt-auto" onClick={() => navigate('/manager/zones')} style={{ background: 'transparent', border: '1px solid var(--v-border)', width: '100%', borderRadius: '12px', marginTop: '24px' }}>
              View All Zones
            </button>
          </div>

          {/* Row 2: Staff & Alert Feed (Assignment for all team) */}
          <div className="v-card v-staff-reports">
            <div className="flex flex-between mb-4">
              <h3 className="v-text-title" style={{ margin: 0 }}>Command Feed</h3>
              <div className="flex gap-2">
                <span className="v-status-pill safe" style={{ fontSize: '10px' }}>{stewardUpdates.length} Reports</span>
                <span className="v-status-pill danger" style={{ fontSize: '10px' }}>{activeAlertsCount} Alerts</span>
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '280px', paddingRight: '8px' }}>
              {/* Critical Alerts First */}
              {alerts.filter(a => a.status === 'TRIGGERED').map(alert => {
                const z = zones.find(zn => zn.id === alert.zone_id)
                return (
                  <div key={alert.id} className="v-report-item alert-urgent">
                    <div className="flex flex-between w-full">
                      <div className="flex gap-3 align-center">
                        <div className="v-avatar danger" style={{ width: '36px', height: '36px', background: 'var(--v-red)' }}>
                          !
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v-red)' }}>CRITICAL ALERT</div>
                          <div className="v-text-sm">{z?.label ? `Zone ${z.label}` : 'Global'} • {alert.message}</div>
                        </div>
                      </div>
                      <button 
                        className="v-status-pill danger" 
                        style={{ cursor: 'pointer', border: 'none' }}
                        onClick={() => acknowledgeAlert(alert.id, profile?.id || '')}
                      >
                        ACK
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Staff Reports */}
              {stewardUpdates.slice(0, 10).map(update => {
                const s = staff.find(st => st.id === update.staff_id)
                const z = zones.find(zn => zn.id === update.zone_id)
                return (
                  <div key={update.id} className="v-report-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/manager/comms')}>
                    <div className="flex gap-3 align-center">
                      <div className="v-avatar" style={{ width: '36px', height: '36px' }}>
                        {s?.display_name ? s.display_name.substring(0, 2).toUpperCase() : 'S'}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{s?.display_name || 'Staff Member'}</div>
                        <div className="v-text-sm">{z?.label ? `Zone ${z.label}` : 'Global'} • {update.message || update.status.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <div className={`v-status-pill ${update.status === 'EMERGENCY' ? 'danger' : update.status === 'CROWD_BUILDING' ? 'warning' : 'safe'}`}>
                      {new Date(update.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}

              {stewardUpdates.length === 0 && alerts.filter(a => a.status === 'TRIGGERED').length === 0 && (
                <p className="v-text-sm text-center py-6 text-muted">System quiet. No active reports or alerts.</p>
              )}
            </div>
          </div>

          {/* Row 2: Circular Progress (Risk Score) */}
          <div className="v-card v-risk-score" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <h3 className="v-text-title" style={{ alignSelf: 'flex-start', width: '100%', textAlign: 'center' }}>Avg Risk Score</h3>
            <div style={{ position: 'relative', width: '140px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--v-card-bg-light)', border: '8px solid var(--v-border)' }}>
              {/* Fake circular border color using box shadow for simplicity, or just text */}
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                {Math.round(zones.reduce((acc, z) => acc + (latestReadings[z.id]?.risk_score || 0), 0) / (zones.length || 1))}
              </div>
            </div>
            <p className="v-text-sm mt-4 text-center">Based on density and flow</p>
          </div>

          {/* Row 3: Active Staff & Coordinators */}
          <div className="v-card v-active-staff" style={{ gridColumn: 'span 12' }}>
            <div className="flex flex-between mb-4">
              <h3 className="v-text-title" style={{ margin: 0 }}>Active Coordinators & Staff</h3>
              <div className="flex gap-2">
                <span className="v-status-pill safe" style={{ fontSize: '10px' }}>
                  {staff.length} Online
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {staff.map(s => {
                const z = zones.find(zn => zn.id === s.zone_id)
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--v-bg-dark)', borderRadius: '12px', border: '1px solid var(--v-border)' }}>
                    <div className="flex gap-3 align-center">
                      <div className="v-avatar">
                        {s.display_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{s.display_name}</div>
                        <div className="v-text-sm">{z?.label ? `Zone ${z.label}` : 'Global'} • {s.role.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <button 
                      className="btn btn-sm" 
                      style={{ fontSize: '12px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--v-text-main)', border: '1px solid var(--v-border)', borderRadius: '16px' }} 
                      onClick={() => handleDirectMessage(s)}
                    >
                      Message
                    </button>
                  </div>
                )
              })}
              {staff.length === 0 && (
                <p className="v-text-sm text-muted">No staff currently online.</p>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Enhanced Send Alert Modal */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--v-card-bg)', border: '1px solid var(--v-border)', borderRadius: '24px', maxWidth: '500px' }}>
            <div className="modal__header" style={{ borderBottom: '1px solid var(--v-border)' }}>
              <h2 className="modal__title"><Megaphone size={16} /> Command Control</h2>
            </div>
            <div className="modal__body flex flex-col gap-4">
              <div className="flex gap-2">
                <button 
                  className={`btn btn-sm ${alertType === 'BROADCAST' ? 'btn-gold' : 'btn-ghost'}`} 
                  onClick={() => setAlertType('BROADCAST')}
                  style={alertType === 'BROADCAST' ? { background: 'var(--v-orange)', color: '#fff' } : {}}
                >
                  Broadcast
                </button>
                <button 
                  className={`btn btn-sm ${alertType === 'ZONE' ? 'btn-gold' : 'btn-ghost'}`} 
                  onClick={() => setAlertType('ZONE')}
                  style={alertType === 'ZONE' ? { background: 'var(--v-orange)', color: '#fff' } : {}}
                >
                  Specific Zone
                </button>
              </div>

              {alertType === 'ZONE' && (
                <div className="input-group">
                  <label className="v-text-sm mb-1 block">Target Zone</label>
                  <select 
                    className="input" 
                    value={selectedTargetZone} 
                    onChange={e => setSelectedTargetZone(e.target.value)}
                    style={{ background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)' }}
                  >
                    <option value="">-- Select Zone --</option>
                    {zones.map(z => <option key={z.id} value={z.id}>Zone {z.label} {z.name ? `(${z.name})` : ''}</option>)}
                  </select>
                </div>
              )}

              <div className="input-group">
                <label className="v-text-sm mb-1 block">Priority Level</label>
                <div className="flex gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(p => (
                    <button 
                      key={p}
                      className={`btn btn-xs ${alertPriority === p ? 'active' : ''}`}
                      onClick={() => setAlertPriority(p)}
                      style={{ 
                        fontSize: '10px', 
                        flex: 1,
                        background: alertPriority === p ? (p === 'CRITICAL' ? 'var(--v-red)' : 'var(--v-orange)') : 'rgba(255,255,255,0.05)'
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="v-text-sm mb-1 block">Message</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Type instruction or warning..."
                  value={alertMessage}
                  onChange={e => setAlertMessage(e.target.value)}
                  style={{ background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)' }}
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn" style={{ background: 'transparent' }} onClick={() => setShowAlertModal(false)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--v-orange)', color: 'white', border: 'none' }} onClick={handleSendAlert} disabled={alertSending || (alertType === 'ZONE' && !selectedTargetZone)}>
                {alertSending ? 'Sending...' : 'Issue Command'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Event Confirmation Modal */}
      {showEndConfirm && (
        <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--v-card-bg)', border: '1px solid var(--v-border)', borderRadius: '24px', maxWidth: '400px' }}>
            <div className="modal__header" style={{ borderBottom: '1px solid var(--v-border)' }}>
              <h2 className="modal__title">End Event?</h2>
            </div>
            <div className="modal__body">
              <p className="text-secondary">This will end monitoring, disconnect all staff, and archive the event data. This action cannot be undone.</p>
            </div>
            <div className="modal__footer">
              <button className="btn" style={{ background: 'transparent' }} onClick={() => setShowEndConfirm(false)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--v-red)', color: 'white', border: 'none' }} onClick={handleEndEvent}>
                End Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
