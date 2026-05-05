import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, 
  Map as MapIcon, 
  LogOut,
  Phone,
  HeartPulse,
  Flame
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
      icon: <Phone size={40} />,
      color: '#2563eb',
      text: 'Are you sure you want to trigger an emergency call to the local police department?'
    },
    AMBULANCE: {
      title: 'Call Ambulance',
      icon: <HeartPulse size={40} />,
      color: '#dc2626',
      text: 'Are you sure you want to trigger an emergency call for medical assistance?'
    },
    FIRE: {
      title: 'Call Fire Dept',
      icon: <Flame size={40} />,
      color: '#ea580c',
      text: 'Are you sure you want to trigger an emergency call for the fire services?'
    }
  }

  const active = config[type]

  return (
    <motion.div 
      className="crowd__modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="crowd__modal"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="crowd__modal-icon" style={{ background: active.color }}>
          {active.icon}
        </div>
        <h2 className="crowd__modal-title">{active.title}</h2>
        <p className="crowd__modal-text">{active.text}</p>
        <div className="crowd__modal-actions">
          <button className="crowd__modal-btn--call" onClick={onConfirm}>
            Confirm Call
          </button>
          <button className="crowd__modal-btn--cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function GuestApp() {
  const { logout, pinSession } = useAuthStore()
  const { zones, alerts, latestReadings, loadEvent, triggerAlert } = useEventStore()
  const [emergencyType, setEmergencyType] = useState<'POLICE' | 'AMBULANCE' | 'FIRE' | null>(null)

  useEffect(() => {
    if (pinSession?.eventId) {
      loadEvent(pinSession.eventId)
    }
  }, [pinSession])

  const handleEmergencyCall = async () => {
    if (!emergencyType || !pinSession?.eventId) return
    
    // Type mapping
    const typeMap = {
      'POLICE': 'POLICE',
      'AMBULANCE': 'MEDICAL',
      'FIRE': 'FIRE'
    } as const

    try {
      await triggerAlert(
        pinSession.eventId,
        null, // General area
        typeMap[emergencyType],
        'CRITICAL',
        `Guest triggered a ${emergencyType} emergency call.`,
        'GUEST'
      )
      setEmergencyType(null)
      alert(`Emergency sent! Security and ${emergencyType} have been notified immediately.`)
    } catch (err) {
      alert('Failed to send emergency alert.')
    }
  }

  return (
    <div className="crowd">
      <header className="crowd__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/main logo-png.png" alt="Logo" style={{ height: '24px' }} />
          <span style={{ fontWeight: 700, fontSize: '18px' }}>Suraksha<span className="text-gold">.pro</span></span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => logout()}>
          <LogOut size={18} />
        </button>
      </header>

      <main className="crowd__content">
        <div className="crowd__section">
          <h2 className="crowd__section-title"><MapIcon size={16} /> Live Occupancy</h2>
          {zones.length === 0 ? (
            <p className="text-muted" style={{ padding: 'var(--space-4)' }}>No active zones to display.</p>
          ) : (
            zones.map((z) => {
              const reading = latestReadings[z.id]
              const density = z.capacity > 0 ? Math.min(100, Math.round(((reading?.density || 0) / z.capacity) * 100)) : 0
              const riskColor = reading?.color_state === 'RED' ? 'var(--color-danger-pulse)' : reading?.color_state === 'YELLOW' ? 'var(--color-warning)' : 'var(--color-safe)'
              
              return (
                <div key={z.id} className="crowd__zone-card">
                  <div className="crowd__zone-header">
                    <h3 className="crowd__zone-name">{z.label} {z.name ? `- ${z.name}` : ''}</h3>
                    <span className="crowd__zone-risk" style={{ color: riskColor }}>
                      {reading?.color_state || 'SAFE'}
                    </span>
                  </div>
                  <div className="crowd__zone-stats">
                    <div>
                      <div className="crowd__stat-label">Density</div>
                      <div className="crowd__stat-value">{density}%</div>
                    </div>
                    <div>
                      <div className="crowd__stat-label">People</div>
                      <div className="crowd__stat-value">{reading?.density || 0}</div>
                    </div>
                  </div>
                  <div className="crowd__progress">
                    <div className="crowd__progress-bar" style={{ width: `${density}%`, background: riskColor }} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        <h2 className="heading-section" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
          <AlertTriangle size={20} className="text-warning" style={{ display: 'inline', marginRight: 'var(--space-2)' }} />
          Recent Announcements
        </h2>
        
        <div className="crowd__alerts">
          {alerts.length === 0 ? (
            <p className="text-muted" style={{ padding: 'var(--space-4)' }}>No announcements yet.</p>
          ) : (
            alerts.slice(0, 5).map(a => (
              <div key={a.id} className="crowd__alert-item">
                <div className="crowd__alert-time">
                  {new Date(a.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="crowd__alert-text">{a.message}</div>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="crowd__footer">
        <button className="crowd__emergency-btn crowd__emergency-btn--police" onClick={() => setEmergencyType('POLICE')}>
          <Phone size={24} />
          <span>Police</span>
        </button>
        <button className="crowd__emergency-btn crowd__emergency-btn--ambulance" onClick={() => setEmergencyType('AMBULANCE')}>
          <HeartPulse size={24} />
          <span>Ambulance</span>
        </button>
        <button className="crowd__emergency-btn crowd__emergency-btn--fire" onClick={() => setEmergencyType('FIRE')}>
          <Flame size={24} />
          <span>Fire</span>
        </button>
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
