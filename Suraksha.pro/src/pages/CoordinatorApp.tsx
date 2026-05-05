import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import AlertCard from '@/components/AlertCard'
import { Mic, MicOff, Shield, Activity, AlertTriangle, MessageSquare } from 'lucide-react'

export default function CoordinatorApp() {
  const { pinSession, profile } = useAuthStore()
  const { zones, alerts, latestReadings, loadEvent, acknowledgeAlert } = useEventStore()
  const [activeTab, setActiveTab] = useState<'zone' | 'comms' | 'alerts'>('zone')
  const [isPTTActive, setIsPTTActive] = useState(false)
  const [textMessage, setTextMessage] = useState('')

  const eventId = pinSession?.eventId || ''
  const zoneId = pinSession?.zoneId || ''

  useEffect(() => {
    if (eventId) loadEvent(eventId)
  }, [eventId])

  const myZone = zones.find(z => z.id === zoneId)
  const myReading = zoneId ? latestReadings[zoneId] : undefined
  const myAlerts = alerts.filter(a => a.zone_id === zoneId)
  const profileId = profile?.id || ''

  const percentage = myZone && myZone.capacity > 0 ? Math.min(100, Math.round(((myReading?.density || 0) / myZone.capacity) * 100)) : 0
  const riskScore = myReading?.risk_score || 0
  const colorState = myReading?.color_state || 'GREEN'
  const riskColor = colorState === 'RED' ? 'var(--color-danger-pulse)' : colorState === 'YELLOW' ? 'var(--color-warning)' : 'var(--color-safe)'

  const handleReport = async (status: 'ALL_CLEAR' | 'CROWD_BUILDING' | 'EMERGENCY') => {
    if (!pinSession) return
    await supabase.from('steward_updates').insert({
      event_id: eventId,
      zone_id: zoneId,
      staff_id: pinSession.staffId,
      status,
    })
  }

  return (
    <div className="page">
      <Navbar />

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'zone' ? 'tab--active' : ''}`} onClick={() => setActiveTab('zone')}>
          <Shield size={14} /> My Zone
        </button>
        <button className={`tab ${activeTab === 'comms' ? 'tab--active' : ''}`} onClick={() => setActiveTab('comms')}>
          <MessageSquare size={14} /> Communicate
        </button>
        <button className={`tab ${activeTab === 'alerts' ? 'tab--active' : ''}`} onClick={() => setActiveTab('alerts')}>
          <AlertTriangle size={14} /> Alerts
          {myAlerts.filter(a => a.status === 'TRIGGERED').length > 0 && (
            <span className="badge badge-danger" style={{ marginLeft: '4px', fontSize: '10px' }}>
              {myAlerts.filter(a => a.status === 'TRIGGERED').length}
            </span>
          )}
        </button>
      </div>

      <div className="p-4 flex-1">
        {/* My Zone Tab */}
        {activeTab === 'zone' && (
          <div className="flex flex-col gap-4">
            <div className="card-glass p-6">
              <div className="flex flex-between" style={{ alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', color: 'var(--color-gold)' }}>
                    Zone {myZone?.label || '?'}
                  </h2>
                  {myZone?.name && <p className="text-secondary">{myZone.name}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', color: riskColor }}>{riskScore}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Risk Score</div>
                </div>
              </div>

              {/* Density Meter */}
              <div className="mt-4">
                <div className="flex flex-between mb-2">
                  <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Density</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: riskColor }}>{percentage}%</span>
                </div>
                <div className="density-bar" style={{ height: '12px' }}>
                  <div className={`density-bar__fill density-bar__fill--${colorState === 'RED' ? 'danger' : colorState === 'YELLOW' ? 'warning' : 'safe'}`} style={{ width: `${percentage}%` }} />
                </div>
              </div>

              {/* Flow Rate */}
              <div className="flex flex-between mt-4">
                <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                  <Activity size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Flow Rate
                </span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>
                  {(myReading?.flow_rate || 0).toFixed(1)} m/min
                </span>
              </div>

              {/* Risk Type */}
              {myReading?.risk_type && myReading.risk_type !== 'NORMAL' && (
                <div className="mt-4" style={{ padding: 'var(--space-3)', background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)' }}>
                  <span style={{ fontWeight: 'var(--weight-bold)', color: riskColor }}>
                    ⚠ {myReading.risk_type.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Report Buttons */}
            <div className="flex flex-col gap-3">
              <button className="steward-status-btn steward-status-btn--clear" onClick={() => handleReport('ALL_CLEAR')}>
                ✅ Mark All Clear
              </button>
              <button className="steward-status-btn steward-status-btn--emergency" onClick={() => handleReport('EMERGENCY')}>
                🚨 Report Issue
              </button>
            </div>
          </div>
        )}

        {/* Communicate Tab */}
        {activeTab === 'comms' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-center" style={{ padding: 'var(--space-8)' }}>
              <button
                className={`ptt-button ${isPTTActive ? 'ptt-button--transmitting' : ''}`}
                onMouseDown={() => setIsPTTActive(true)}
                onMouseUp={() => setIsPTTActive(false)}
                onTouchStart={() => setIsPTTActive(true)}
                onTouchEnd={() => setIsPTTActive(false)}
              >
                {isPTTActive ? <MicOff size={32} /> : <Mic size={32} className="text-gold" />}
              </button>
            </div>
            <p className="text-center text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              {isPTTActive ? '🔴 Transmitting on Zone channel...' : 'Hold to talk on Zone channel'}
            </p>

            <div className="mt-6">
              <h4 className="text-secondary mb-2" style={{ fontSize: 'var(--text-sm)' }}>Send Message to Admin</h4>
              <div className="flex gap-2">
                <input className="input" placeholder="Type message..." value={textMessage} onChange={e => setTextMessage(e.target.value)} />
                <button className="btn btn-primary btn-sm">Send</button>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="flex flex-col gap-3">
            {myAlerts.length === 0 ? (
              <p className="text-muted text-center p-6">No alerts for your zone.</p>
            ) : (
              myAlerts.map(a => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  onAcknowledge={() => acknowledgeAlert(a.id, profileId)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
