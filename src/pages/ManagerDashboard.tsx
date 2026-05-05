import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import { Plus, Copy, Check, Megaphone, Activity } from 'lucide-react'
import { LineChart, Line, XAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import './ManagerDashboard.css'

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const {
    activeEvent, zones, alerts, staff, latestReadings, stewardUpdates,
    loadEvent, clearEvent,
  } = useEventStore()

  const [loading, setLoading] = useState(true)

  // Generate Event Code states
  const [pinCopied, setPinCopied] = useState(false)

  // Send Alert modal states
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
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
      if (pct > 90) { riskType = 'STAMPEDE_RISK'; riskScore = Math.max(90, riskScore); colorState = 'RED' }
      else if (pct > 75) { riskType = 'BOTTLENECK'; riskScore = Math.max(75, riskScore); colorState = 'YELLOW' }

      await supabase.from('zone_readings').insert({
        event_id: activeEvent.id,
        zone_id: z.id,
        density: newDensity,
        flow_rate: Math.random() * 5 + 1,
        risk_score: riskScore,
        risk_type: riskType,
        color_state: colorState,
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [isSimulating, activeEvent, zones, latestReadings])

  useEffect(() => {
    loadActiveEvent()
    return () => clearEvent()
  }, [])

  const loadActiveEvent = async () => {
    if (!profile) { setLoading(false); return }
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

  // Send manual broadcast alert
  const handleSendAlert = async () => {
    if (!activeEvent || !alertMessage.trim()) return
    setAlertSending(true)
    try {
      await supabase.from('alerts').insert({
        event_id: activeEvent.id,
        zone_id: zones[0]?.id ?? null, // broadcast — attach to first zone or null
        risk_type: 'NORMAL',
        risk_score: 50,
        priority: 'HIGH',
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
    const base = totalPeople || 50
    return [
      { name: 'Mon', density: Math.max(0, base - 20), prev: base - 10 },
      { name: 'Tue', density: Math.max(0, base - 5), prev: base + 5 },
      { name: 'Wed', density: base + 15, prev: base - 5 },
      { name: 'Thu', density: base - 10, prev: base + 20 },
      { name: 'Fri', density: base + 30, prev: base + 10 },
      { name: 'Sat', density: base + 10, prev: base - 15 },
      { name: 'Sun', density: totalPeople, prev: base },
    ]
  }, [totalPeople])

  if (loading) {
    return <div className="virtus-layout"><div style={{ margin: 'auto' }}><div className="spinner spinner-lg" /></div></div>
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
            <button className="virtus-pill" onClick={handleCopyPin}>
              {pinCopied ? <Check size={14} color="#4dff4d" /> : <Copy size={14} />} PIN: {activeEvent.pin}
            </button>
          </div>
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

          {/* Row 1: Awesome Performance (Line Chart) */}
          <div className="v-card v-performance">
            <h3 className="v-text-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Crowd Flow <div className="flex gap-4">
                <span style={{ fontSize: '12px', color: 'var(--v-orange)' }}>● Today</span>
                <span style={{ fontSize: '12px', color: 'var(--v-text-muted)' }}>● Yesterday</span>
              </div>
            </h3>
            <div style={{ display: 'flex', gap: '32px', marginBottom: '16px' }}>
              <div><span className="v-text-huge" style={{ fontSize: '32px' }}>{totalDensityPct}%</span></div>
              <div><span className="v-text-huge" style={{ fontSize: '32px' }}>{Math.max(0, totalDensityPct - 12)}%</span></div>
              <div><span className="v-text-huge" style={{ fontSize: '32px', color: 'var(--v-text-muted)' }}>{Math.max(0, totalDensityPct + 5)}%</span></div>
            </div>
            <div style={{ height: '160px', width: '100%', marginLeft: '-20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={10} />
                  <Tooltip contentStyle={{ background: 'var(--v-card-bg)', border: '1px solid var(--v-border)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="density" stroke="var(--v-orange)" strokeWidth={3} dot={{ r: 4, fill: 'var(--v-orange)', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="prev" stroke="var(--v-border)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Zone Capacities (Main Goal) */}
          <div className="v-card v-zone-capacities">
            <h3 className="v-text-title">Zone Occupancy</h3>
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
                        background: reading?.color_state === 'RED' ? '#ff4d4d' : reading?.color_state === 'YELLOW' ? 'orange' : 'var(--v-orange)'
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <button className="btn mt-auto" style={{ background: 'transparent', border: '1px solid var(--v-border)', width: '100%', borderRadius: '12px', marginTop: '24px' }}>
              View All Zones
            </button>
          </div>

          {/* Row 2: Staff Reports (Assignment for all team) */}
          <div className="v-card v-staff-reports">
            <h3 className="v-text-title">Staff Updates</h3>
            <div style={{ overflowY: 'auto', maxHeight: '240px', paddingRight: '8px' }}>
              {stewardUpdates.length === 0 ? (
                <p className="v-text-sm text-center">No reports yet.</p>
              ) : (
                stewardUpdates.slice(0, 4).map(update => {
                  const s = staff.find(st => st.id === update.staff_id)
                  const z = zones.find(zn => zn.id === update.zone_id)
                  return (
                    <div key={update.id} className="v-report-item">
                      <div className="flex gap-3 align-center">
                        <div className="v-avatar" style={{ width: '36px', height: '36px' }}>
                          {s?.display_name ? s.display_name.substring(0, 2).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>{s?.display_name || 'Staff Member'}</div>
                          <div className="v-text-sm">{z?.label ? `Zone ${z.label}` : 'Global'} • {new Date(update.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                      <div className={`v-status-pill ${update.status === 'EMERGENCY' ? 'danger' : update.status === 'CROWD_BUILDING' ? 'warning' : 'safe'}`}>
                        {update.status.replace('_', ' ')}
                      </div>
                    </div>
                  )
                })
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

        </div>
      </main>

      {/* Modals from original logic */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--v-card-bg)', border: '1px solid var(--v-border)', borderRadius: '24px' }}>
            <div className="modal__header" style={{ borderBottom: '1px solid var(--v-border)' }}>
              <h2 className="modal__title"><Megaphone size={16} /> Broadcast Alert</h2>
            </div>
            <div className="modal__body">
              <textarea
                className="input"
                rows={3}
                placeholder="Type message..."
                value={alertMessage}
                onChange={e => setAlertMessage(e.target.value)}
                style={{ background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)' }}
              />
            </div>
            <div className="modal__footer">
              <button className="btn" style={{ background: 'transparent' }} onClick={() => setShowAlertModal(false)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--v-orange)', color: 'white', border: 'none' }} onClick={handleSendAlert} disabled={alertSending}>
                {alertSending ? 'Sending...' : 'Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
