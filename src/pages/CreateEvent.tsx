import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import { ArrowLeft, ArrowRight, Plus, Trash2, Copy, Check } from 'lucide-react'
import './CreateEvent.css'

interface ZoneInput {
  label: string
  name: string
  capacity: number
}

export default function CreateEvent() {
  const navigate = useNavigate()
  const { profile, role } = useAuthStore()
  const { createEvent, isLoading } = useEventStore()

  const [step, setStep] = useState(1)
  const [eventName, setEventName] = useState('')
  const [venueName, setVenueName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [totalCapacity, setTotalCapacity] = useState(1000)
  const [zones, setZones] = useState<ZoneInput[]>([
    { label: 'A', name: 'Entry Gate', capacity: 250 },
    { label: 'B', name: 'Main Stage', capacity: 500 },
  ])
  const [createdPin, setCreatedPin] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const nextLabel = () => {
    const lastLabel = zones[zones.length - 1]?.label || '@'
    return String.fromCharCode(lastLabel.charCodeAt(0) + 1)
  }

  const addZone = () => {
    if (zones.length >= 26) return
    setZones([...zones, { label: nextLabel(), name: '', capacity: 100 }])
  }

  const removeZone = (index: number) => {
    if (zones.length <= 1) return
    setZones(zones.filter((_, i) => i !== index))
  }

  const updateZone = (index: number, field: keyof ZoneInput, value: string | number) => {
    const updated = [...zones]
    updated[index] = { ...updated[index], [field]: value }
    setZones(updated)
  }

  const handleCreate = async () => {
    if (!profile) return
    setError('')
    try {
      const event = await createEvent({
        name: eventName,
        venue_name: venueName || undefined,
        event_date: eventDate || undefined,
        total_capacity: totalCapacity,
        zones: zones.map(z => ({ label: z.label, name: z.name || undefined, capacity: z.capacity })),
      }, profile.id)
      setCreatedPin(event.pin)
      setStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create event')
    }
  }

  const copyPin = () => {
    navigator.clipboard.writeText(createdPin)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="create-event page">
      <div className="header">
        <div className="header__left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(role === 'ADMIN' ? '/dashboard' : '/manager')}>
            <ArrowLeft size={18} />
          </button>
          <h1 className="header__title">Create Event</h1>
        </div>
        <div className="create-event__steps">
          {['Details', 'Zones', 'Review'].map((_, i) => (
            <div key={i} className={`create-event__step-dot ${step >= i + 1 ? 'create-event__step-dot--active' : ''}`}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="create-event__content container">
        {error && <div className="auth__error">{error}</div>}

        {/* Step 1: Event Details */}
        {step === 1 && (
          <div className="create-event__form card-glass">
            <h2 className="heading-section mb-6">Event Details</h2>
            <div className="auth__form">
              <div className="input-group">
                <label className="input-label">Event Name *</label>
                <input className="input" placeholder="Navaratri 2026" value={eventName} onChange={e => setEventName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Venue Name</label>
                <input className="input" placeholder="Gandhi Maidan" value={venueName} onChange={e => setVenueName(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Date & Time</label>
                <input type="datetime-local" className="input" value={eventDate} onChange={e => setEventDate(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Total Expected Capacity</label>
                <input type="number" className="input" min={10} value={totalCapacity} onChange={e => setTotalCapacity(Number(e.target.value))} />
              </div>
              <button className="btn btn-gold w-full" onClick={() => setStep(2)} disabled={!eventName.trim()}>
                Next: Set Up Zones <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Zones */}
        {step === 2 && (
          <div className="create-event__form card-glass">
            <h2 className="heading-section mb-6">Zone Setup</h2>
            <div className="create-event__zones-list">
              {zones.map((zone, i) => (
                <div key={i} className="create-event__zone-row">
                  <div className="create-event__zone-label">Zone {zone.label}</div>
                  <input className="input" placeholder="Zone name (e.g. Entry Gate)" value={zone.name} onChange={e => updateZone(i, 'name', e.target.value)} />
                  <input type="number" className="input create-event__zone-cap" placeholder="Capacity" min={10} value={zone.capacity} onChange={e => updateZone(i, 'capacity', Number(e.target.value))} />
                  {zones.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => removeZone(i)}>
                      <Trash2 size={16} className="text-danger" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {zones.length < 26 && (
              <button className="btn btn-outline w-full mt-4" onClick={addZone}>
                <Plus size={16} /> Add Zone
              </button>
            )}
            <div className="flex gap-4 mt-6">
              <button className="btn btn-ghost flex-1" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-gold flex-1" onClick={() => setStep(3)}>
                Review <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && !createdPin && (
          <div className="create-event__form card-glass">
            <h2 className="heading-section mb-6">Review & Create</h2>
            <div className="create-event__review">
              <div className="create-event__review-row">
                <span className="text-secondary">Event</span>
                <span>{eventName}</span>
              </div>
              {venueName && (
                <div className="create-event__review-row">
                  <span className="text-secondary">Venue</span>
                  <span>{venueName}</span>
                </div>
              )}
              {eventDate && (
                <div className="create-event__review-row">
                  <span className="text-secondary">Date</span>
                  <span>{new Date(eventDate).toLocaleString()}</span>
                </div>
              )}
              <div className="create-event__review-row">
                <span className="text-secondary">Total Capacity</span>
                <span>{totalCapacity.toLocaleString()}</span>
              </div>
              <div className="create-event__review-row">
                <span className="text-secondary">Zones</span>
                <span>{zones.length}</span>
              </div>
              <div className="create-event__zone-summary">
                {zones.map((z, i) => (
                  <div key={i} className="badge badge-info">
                    {z.label}{z.name ? `: ${z.name}` : ''} ({z.capacity})
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button className="btn btn-ghost flex-1" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-gold flex-1" onClick={handleCreate} disabled={isLoading}>
                {isLoading ? <span className="spinner" /> : 'Create Event'}
              </button>
            </div>
          </div>
        )}

        {/* Success — PIN Display */}
        {step === 3 && createdPin && (
          <div className="create-event__form card-glass" style={{ textAlign: 'center' }}>
            <div className="create-event__success-icon">✅</div>
            <h2 className="heading-section mb-4">Event Created!</h2>
            <p className="text-secondary mb-6">Share this PIN with your coordinators and stewards</p>
            <div className="create-event__pin-display" onClick={copyPin}>
              <span className="create-event__pin-digits">{createdPin}</span>
              {copied ? <Check size={20} className="text-safe" /> : <Copy size={20} className="text-gold" />}
            </div>
            <p className="text-muted mt-2" style={{ fontSize: 'var(--text-xs)' }}>
              {copied ? 'Copied!' : 'Tap to copy'}
            </p>
            <div className="flex gap-4 mt-8">
              <button className="btn btn-outline flex-1" onClick={() => navigate('/event/history')}>View Events</button>
              <button className="btn btn-gold flex-1" onClick={() => navigate(role === 'ADMIN' ? '/dashboard' : '/manager')}>Go to Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
