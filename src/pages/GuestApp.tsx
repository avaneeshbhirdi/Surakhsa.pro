import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  MapPin,
  LogOut,
  Phone,
  HeartPulse,
  Flame,
  Users,
  Activity,
  Megaphone,
  ShieldCheck,
  Clock,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import './GuestApp.css'

interface EmergencyModalProps {
  type: 'POLICE' | 'AMBULANCE' | 'FIRE' | null
  onClose: () => void
  onConfirm: () => void
}

function EmergencyModal({ type, onClose, onConfirm }: EmergencyModalProps) {
  if (!type) return null

  const config = {
    POLICE: {
      title: 'Call Police',
      icon: <Phone size={36} />,
      color: '#3b82f6',
      glow: 'rgba(59,130,246,0.35)',
      text: 'This will immediately alert security and notify local police. Only use in a genuine emergency.',
    },
    AMBULANCE: {
      title: 'Medical Emergency',
      icon: <HeartPulse size={36} />,
      color: '#ef4444',
      glow: 'rgba(239,68,68,0.35)',
      text: 'This will dispatch medical staff to your location. Only use if someone needs urgent medical help.',
    },
    FIRE: {
      title: 'Fire Emergency',
      icon: <Flame size={36} />,
      color: '#f97316',
      glow: 'rgba(249,115,22,0.35)',
      text: 'This will trigger the fire response protocol immediately. Only use if you see fire or smell smoke.',
    },
  }

  const active = config[type]

  return (
    <motion.div
      className="g-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="g-modal"
        initial={{ scale: 0.88, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 24 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="g-modal-icon" style={{ background: active.color, boxShadow: `0 0 32px ${active.glow}` }}>
          {active.icon}
        </div>
        <h2 className="g-modal-title">{active.title}</h2>
        <p className="g-modal-text">{active.text}</p>
        <button className="g-modal-confirm" style={{ background: active.color, boxShadow: `0 4px 20px ${active.glow}` }} onClick={onConfirm}>
          ⚡ Confirm Emergency
        </button>
        <button className="g-modal-cancel" onClick={onClose}>Cancel</button>
      </motion.div>
    </motion.div>
  )
}

export default function GuestApp() {
  const { logout, pinSession } = useAuthStore()
  const { zones, alerts, latestReadings, loadEvent, triggerAlert, activeEvent } = useEventStore()
  const [emergencyType, setEmergencyType] = useState<'POLICE' | 'AMBULANCE' | 'FIRE' | null>(null)
  const [emergencySent, setEmergencySent] = useState(false)

  useEffect(() => {
    if (pinSession?.eventId) loadEvent(pinSession.eventId)
  }, [pinSession?.eventId])

  const handleEmergencyCall = async () => {
    if (!emergencyType || !pinSession?.eventId) return
    const typeMap = { POLICE: 'POLICE', AMBULANCE: 'MEDICAL', FIRE: 'FIRE' } as const
    try {
      await triggerAlert(
        pinSession.eventId, null,
        typeMap[emergencyType], 'CRITICAL',
        `🆘 Guest triggered a ${emergencyType} emergency call.`,
        'GUEST'
      )
      setEmergencyType(null)
      setEmergencySent(true)
      setTimeout(() => setEmergencySent(false), 4000)
    } catch {
      alert('Failed to send emergency alert.')
    }
  }

  // Overall crowd level
  const totalPeople = Object.values(latestReadings).reduce((acc, r) => acc + (r.density || 0), 0)
  const totalCap = zones.reduce((acc, z) => acc + z.capacity, 0)
  const overallPct = totalCap > 0 ? Math.min(100, Math.round((totalPeople / totalCap) * 100)) : 0
  const overallStatus = overallPct >= 85 ? 'CROWDED' : overallPct >= 60 ? 'MODERATE' : 'COMFORTABLE'
  const overallColor = overallPct >= 85 ? '#ef4444' : overallPct >= 60 ? '#f97316' : '#22c55e'

  const activeAlerts = alerts.filter(a => a.status === 'TRIGGERED')

  return (
    <div className="g-app">
      {/* Header */}
      <header className="g-header">
        <div className="g-header-brand">
          <img src="/main logo-png.png" alt="Logo" style={{ height: '22px' }} />
          <span className="g-header-title">Suraksha<span className="g-gold">.pro</span></span>
        </div>
        {activeEvent && (
          <div className="g-header-event">
            <span className="g-live-dot" />
            <span>{activeEvent.name}</span>
          </div>
        )}
        <button className="g-logout-btn" onClick={() => logout()} title="Leave event">
          <LogOut size={16} />
        </button>
      </header>

      <main className="g-content">

        {/* ── Hero Status Banner ── */}
        <div className="g-hero" style={{ borderColor: overallColor + '44', background: `linear-gradient(135deg, ${overallColor}11 0%, ${overallColor}05 100%)` }}>
          <div className="g-hero-left">
            <div className="g-hero-label">Overall Venue Status</div>
            <div className="g-hero-status" style={{ color: overallColor }}>{overallStatus}</div>
            <div className="g-hero-sub">{totalPeople.toLocaleString()} people · {overallPct}% capacity</div>
          </div>
          <div className="g-hero-ring" style={{ '--ring-color': overallColor } as React.CSSProperties}>
            <svg viewBox="0 0 80 80" className="g-ring-svg">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
              <circle cx="40" cy="40" r="32" fill="none" stroke={overallColor} strokeWidth="7"
                strokeDasharray={`${overallPct * 2.01} 201`} strokeLinecap="round"
                transform="rotate(-90 40 40)" style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
            </svg>
            <span className="g-ring-pct" style={{ color: overallColor }}>{overallPct}%</span>
          </div>
        </div>

        {/* Emergency sent toast */}
        <AnimatePresence>
          {emergencySent && (
            <motion.div className="g-toast" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <ShieldCheck size={18} /> Emergency alert sent — help is on the way!
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active Alerts strip ── */}
        {activeAlerts.length > 0 && (
          <div className="g-alert-strip">
            <AlertTriangle size={15} className="g-alert-strip-icon" />
            <span><strong>{activeAlerts.length} active alert{activeAlerts.length > 1 ? 's' : ''}</strong> — Follow staff instructions and stay calm.</span>
          </div>
        )}

        {/* ── Zone Cards ── */}
        <section>
          <div className="g-section-header">
            <MapPin size={14} />
            <span>Live Zone Occupancy</span>
          </div>
          <div className="g-zones-grid">
            {zones.length === 0 ? (
              <div className="g-empty">No zones available yet.</div>
            ) : zones.map(z => {
              const reading = latestReadings[z.id]
              const pct = z.capacity > 0 ? Math.min(100, Math.round(((reading?.density || 0) / z.capacity) * 100)) : 0
              const color = pct >= 85 ? '#ef4444' : pct >= 60 ? '#f97316' : '#22c55e'
              const label = pct >= 85 ? 'Crowded' : pct >= 60 ? 'Filling Up' : 'Available'

              return (
                <div key={z.id} className="g-zone-card">
                  <div className="g-zone-top">
                    <div>
                      <div className="g-zone-label">{z.label}{z.name ? ` · ${z.name}` : ''}</div>
                      <div className="g-zone-status" style={{ color }}>{label}</div>
                    </div>
                    <div className="g-zone-pct" style={{ color }}>{pct}%</div>
                  </div>
                  <div className="g-zone-bar-track">
                    <div className="g-zone-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="g-zone-meta">
                    <span><Users size={11} /> {reading?.density || 0} people</span>
                    <span><Activity size={11} /> Risk: {reading?.risk_score || 0}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Announcements ── */}
        <section>
          <div className="g-section-header">
            <Megaphone size={14} />
            <span>Announcements</span>
          </div>
          <div className="g-announcements">
            {alerts.length === 0 ? (
              <div className="g-empty">All clear — no announcements yet.</div>
            ) : (
              alerts.slice(0, 6).map((a, i) => {
                const isUrgent = a.priority === 'CRITICAL' || a.priority === 'HIGH'
                return (
                  <motion.div
                    key={a.id}
                    className={`g-announce-card ${isUrgent ? 'g-announce-card--urgent' : ''}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="g-announce-dot" style={{ background: isUrgent ? '#ef4444' : '#f97316' }} />
                    <div className="g-announce-body">
                      <div className="g-announce-text">{a.message}</div>
                      <div className="g-announce-time">
                        <Clock size={10} />
                        {new Date(a.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {isUrgent && <span className="g-announce-badge">URGENT</span>}
                  </motion.div>
                )
              })
            )}
          </div>
        </section>

        {/* ── Safety Tips ── */}
        <div className="g-safety-tip">
          <ShieldCheck size={15} />
          <span>Stay near exits · Follow staff instructions · Keep moving if crowded</span>
        </div>

      </main>

      {/* ── Emergency Footer ── */}
      <footer className="g-footer">
        <div className="g-footer-label">🆘 Emergency Services</div>
        <div className="g-emergency-row">
          <button className="g-em-btn g-em-btn--police" onClick={() => setEmergencyType('POLICE')}>
            <div className="g-em-icon"><Phone size={22} /></div>
            <span>Police</span>
          </button>
          <button className="g-em-btn g-em-btn--ambulance" onClick={() => setEmergencyType('AMBULANCE')}>
            <div className="g-em-icon"><HeartPulse size={22} /></div>
            <span>Ambulance</span>
          </button>
          <button className="g-em-btn g-em-btn--fire" onClick={() => setEmergencyType('FIRE')}>
            <div className="g-em-icon"><Flame size={22} /></div>
            <span>Fire</span>
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {emergencyType && (
          <EmergencyModal
            type={emergencyType}
            onClose={() => setEmergencyType(null)}
            onConfirm={handleEmergencyCall}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
