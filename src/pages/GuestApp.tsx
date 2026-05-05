import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Activity, 
  Map as MapIcon, 
  AlertTriangle, 
  Phone, 
  HeartPulse, 
  Flame, 
  LogOut 
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
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
  const { logout } = useAuthStore()
  const [emergencyType, setEmergencyType] = useState<'POLICE' | 'AMBULANCE' | 'FIRE' | null>(null)

  // Simulated live data
  const zones = [
    { name: 'Conference Room A', density: '82%', people: 124, risk: 'CRITICAL' },
    { name: 'Dining Hall', density: '45%', people: 68, risk: 'SAFE' },
    { name: 'Main Lobby', density: '68%', people: 210, risk: 'WARNING' },
    { name: 'Exhibition Hall 1', density: '12%', people: 15, risk: 'SAFE' },
  ]

  const alerts = [
    { id: 1, time: '2m ago', text: 'Crowd density increasing at Main Entrance. Please use North Gate.' },
    { id: 2, time: '15m ago', text: 'Lost child reported near Zone 3. Blue tshirt, age 6.' },
    { id: 3, time: '45m ago', text: 'First aid station now open near Gate 4.' },
  ]

  const handleEmergencyCall = () => {
    // In a real app, this would use window.location.href = 'tel:...'
    console.log(`Simulating call to ${emergencyType}`)
    setEmergencyType(null)
    alert(`Initiating emergency call to ${emergencyType}...`)
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
          <h2 className="crowd__section-title"><MapIcon size={16} /> Live Heatmap</h2>
          <div className="crowd__map-card">
            <div className="crowd__map-placeholder">
              <div className="crowd__map-overlay" />
              <Shield size={48} color="rgba(255,255,255,0.2)" />
              <span style={{ position: 'absolute', bottom: '20px', fontSize: '12px', opacity: 0.5 }}>READ-ONLY SAFETY VIEW</span>
            </div>
          </div>
        </div>

        <div className="crowd__section">
          <h2 className="crowd__section-title"><Activity size={16} /> Room Status & Occupancy</h2>
          <div className="crowd__zones">
            {zones.map((zone, idx) => (
              <div key={idx} className="crowd__zone-item">
                <div className="crowd__zone-info">
                  <span className="crowd__zone-name">{zone.name}</span>
                  <span className="crowd__zone-density">{zone.people} people present • {zone.density} capacity</span>
                </div>
                <span className={`crowd__risk-badge crowd__risk-badge--${zone.risk.toLowerCase()}`}>
                  {zone.risk}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="crowd__section">
          <h2 className="crowd__section-title"><AlertTriangle size={16} /> Live Alerts</h2>
          <div className="crowd__alerts">
            {alerts.map(alert => (
              <div key={alert.id} className="crowd__alert-item">
                <div className="crowd__alert-time">{alert.time}</div>
                <div className="crowd__alert-text">{alert.text}</div>
              </div>
            ))}
          </div>
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
