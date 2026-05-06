import { useState, useEffect, useRef } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import { MapPin, AlertTriangle, RotateCw } from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'
import RealtimeStatus from '@/components/RealtimeStatus'

export default function ManagerMap() {
  const { profile } = useAuthStore()
  const { activeEvent, zones, latestReadings, alerts, loadEvent } = useEventStore()
  const { t } = useLang()
  const [loading, setLoading] = useState(!activeEvent) // skip loading if event already in store

  const [positions, setPositions] = useState<Record<string, {x: number, y: number, r?: number}>>(() => {
    try {
      const saved = localStorage.getItem('virtus_zone_positions')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {}
  })
  
  const [draggingZone, setDraggingZone] = useState<string | null>(null)
  const draggingRef = useRef<{ id: string, startX: number, startY: number, initialPctX: number, initialPctY: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent, id: string, defaultLeft: string, defaultTop: string) => {
    e.preventDefault()
    setDraggingZone(id)
    const pos = positions[id] || {
      x: parseFloat(defaultLeft),
      y: parseFloat(defaultTop)
    }
    draggingRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialPctX: pos.x,
      initialPctY: pos.y
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return
    const { id, startX, startY, initialPctX, initialPctY } = draggingRef.current
    const container = e.currentTarget as HTMLDivElement
    const rect = container.getBoundingClientRect()

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    const deltaPctX = (deltaX / rect.width) * 100
    const deltaPctY = (deltaY / rect.height) * 100

    setPositions(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        x: Math.max(0, Math.min(90, initialPctX + deltaPctX)),
        y: Math.max(0, Math.min(90, initialPctY + deltaPctY))
      }
    }))
  }

  const handleMouseUp = () => {
    if (draggingRef.current) {
      localStorage.setItem('virtus_zone_positions', JSON.stringify(positions))
      draggingRef.current = null
      setDraggingZone(null)
    }
  }

  const handleRotate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setPositions(prev => {
      const pos = prev[id] || { x: 0, y: 0, r: 0 }
      const newPos = { ...pos, r: ((pos.r || 0) + 90) % 360 }
      const newPositions = { ...prev, [id]: newPos }
      localStorage.setItem('virtus_zone_positions', JSON.stringify(newPositions))
      return newPositions
    })
  }

  useEffect(() => {
    // If event already in store, no loading needed
    if (activeEvent) { setLoading(false); return }
    if (!profile) { setLoading(false); return }
    const loadActiveEvent = async () => {
      const { data: events } = await supabase
        .from('events').select('*')
        .eq('admin_id', profile.id)
        .in('status', ['ACTIVE', 'PAUSED', 'DRAFT'])
        .order('created_at', { ascending: false }).limit(1)
      if (events && events.length > 0) await loadEvent(events[0].id)
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
            <MapPin size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
            <h2 className="v-text-title">{t('mgrNoEvent')}</h2>
            <p className="v-text-sm">{t('mgrStartEventFromDashboard')}</p>
          </div>
        </main>
      </div>
    )
  }

  const activeAlertZones = new Set(alerts.filter(a => a.status === 'TRIGGERED').map(a => a.zone_id))

  // Sort zones by density percentage
  const sortedZones = [...zones].sort((a, b) => {
    const pA = a.capacity > 0 ? ((latestReadings[a.id]?.density || 0) / a.capacity) * 100 : 0
    const pB = b.capacity > 0 ? ((latestReadings[b.id]?.density || 0) / b.capacity) * 100 : 0
    return pB - pA
  })

  // Hardcoded positions to simulate map layout
  const PREDEFINED_POSITIONS = [
    { top: '10%', left: '35%' }, // North Gate
    { top: '25%', left: '60%' }, // Food Court
    { top: '30%', left: '15%' }, // Main Stage
    { top: '45%', left: '40%' }, // VIP Lounge
    { top: '60%', left: '65%' }, // East Corridor
    { top: '65%', left: '10%' }, // West Pavilion
    { top: '75%', left: '35%' }, // South Exit
  ]

  const getRiskColor = (pct: number) => {
    if (pct >= 80) return '#ff1a1a' // CRITICAL
    if (pct >= 60) return '#ff4d4d' // HIGH
    if (pct >= 40) return '#ffcc00' // MODERATE / LOW
    return '#00ff88' // SAFE
  }

  const getRiskLabel = (pct: number) => {
    if (pct >= 80) return t('mgrCritical')
    if (pct >= 60) return t('mgrHigh')
    if (pct >= 40) return t('mgrLow')
    return t('mgrSafe')
  }

  const maxCapacity = Math.max(...zones.map(z => z.capacity), 1)

  return (
    <div className="virtus-layout">
      <ManagerSidebar />
      <main className="virtus-main" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
        <header className="virtus-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--v-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: 'var(--v-text-muted)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            {t('mgrVenueMap')} — {t('mgrRiskOverlay')}
          </span>
          <RealtimeStatus />
        </header>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Left: Heatmap Canvas */}
          <div style={{ 
            flex: 1, 
            position: 'relative', 
            background: 'var(--v-bg-dark)',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            overflow: 'auto',
            padding: '24px'
          }}>
            <div 
              style={{ position: 'relative', width: '100%', height: '100%', minHeight: '600px', minWidth: '600px' }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {zones.map((z, idx) => {
                const reading = latestReadings[z.id]
                const density = reading?.density || 0
                const pct = z.capacity > 0 ? Math.min(100, Math.round((density / z.capacity) * 100)) : 0
                const hasAlert = activeAlertZones.has(z.id)
                const color = getRiskColor(pct)
                const riskLabel = getRiskLabel(pct)
                const defaultPos = PREDEFINED_POSITIONS[idx % PREDEFINED_POSITIONS.length]
                const currentPos = positions[z.id] || { x: parseFloat(defaultPos.left), y: parseFloat(defaultPos.top) }
                
                // Scale width based on capacity (160px to 460px)
                const capacityScale = maxCapacity > 0 ? (z.capacity / maxCapacity) : 0
                const boxWidth = `${160 + (300 * capacityScale)}px`
                const boxMinHeight = `100px`

                return (
                  <div 
                    key={z.id} 
                    onMouseDown={(e) => handleMouseDown(e, z.id, defaultPos.left, defaultPos.top)}
                    style={{
                      position: 'absolute',
                      top: `${currentPos.y}%`,
                      left: `${currentPos.x}%`,
                      background: `${color}10`,
                      border: `1px solid ${color}`,
                      borderRadius: '8px',
                      padding: '12px 24px',
                      width: boxWidth,
                      minHeight: boxMinHeight,
                      boxShadow: draggingZone === z.id ? `0 0 30px ${color}50` : `0 0 20px ${color}20`,
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: draggingZone === z.id ? 'grabbing' : 'grab',
                      transition: draggingZone === z.id ? 'none' : 'box-shadow 0.2s',
                      zIndex: draggingZone === z.id ? 10 : 1,
                      transform: `rotate(${currentPos.r || 0}deg)`
                    }}
                  >
                    {hasAlert && (
                      <span style={{
                        position: 'absolute', top: '-10px', right: '-10px',
                        background: '#ff1a1a', color: 'white', borderRadius: '50%',
                        width: '24px', height: '24px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '12px', fontWeight: 700,
                        boxShadow: '0 0 10px #ff1a1a'
                      }}><AlertTriangle size={14} /></span>
                    )}
                    <button 
                      onClick={(e) => handleRotate(e, z.id)}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute', top: '8px', left: '8px',
                        background: 'transparent', border: 'none', color: 'var(--v-text-muted)',
                        cursor: 'pointer', padding: '4px', display: 'flex', opacity: 0.5,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                      title="Rotate 90°"
                    >
                      <RotateCw size={14} />
                    </button>
                    <span style={{ fontSize: '10px', color: 'var(--v-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{z.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{z.name}</span>
                    <span style={{ fontSize: '28px', fontWeight: 800, color, marginTop: '4px' }}>{pct}%</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color, letterSpacing: '1px' }}>{riskLabel}</span>
                  </div>
                )
              })}
            </div>
            
            {/* Footer Legend within Map */}
            <div style={{ position: 'absolute', bottom: '24px', left: '24px', display: 'flex', gap: '16px', fontSize: '10px', fontWeight: 600, color: 'var(--v-text-muted)', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '20px', backdropFilter: 'blur(10px)', border: '1px solid var(--v-border)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, borderRadius: '2px', background: '#00ff88' }} /> {t('mgrSafe')}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, borderRadius: '2px', background: '#ffcc00' }} /> {t('mgrLow')}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, borderRadius: '2px', background: '#ff8800' }} /> {t('mgrModerate')}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, borderRadius: '2px', background: '#ff4d4d' }} /> {t('mgrHigh')}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, borderRadius: '2px', background: '#ff1a1a' }} /> {t('mgrCritical')}</span>
            </div>
          </div>

          {/* Right: Risk Summary Sidebar */}
          <div style={{ 
            width: '320px', 
            background: 'var(--v-sidebar-bg)', 
            borderLeft: '1px solid var(--v-border)', 
            display: 'flex', 
            flexDirection: 'column',
            overflowY: 'auto'
          }}>
            <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--v-border)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v-text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {t('mgrZonesHeader')} — {t('mgrRiskSummary')}
              </span>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sortedZones.map((z) => {
                const reading = latestReadings[z.id]
                const density = reading?.density || 0
                const pct = z.capacity > 0 ? Math.min(100, Math.round((density / z.capacity) * 100)) : 0
                const color = getRiskColor(pct)
                const riskLabel = getRiskLabel(pct)

                return (
                  <div key={z.id} style={{
                    background: 'var(--v-card-bg)',
                    border: '1px solid var(--v-border)',
                    borderRadius: '8px',
                    padding: '16px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Bottom Progress Bar */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', width: '100%', background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 1s ease' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{z.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--v-text-muted)' }}>{z.label}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color }}>{pct}%</span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color, letterSpacing: '0.5px' }}>{riskLabel}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {sortedZones.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--v-text-muted)' }}>
                  <MapPin size={32} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '12px' }}>{t('mgrNoZones')}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
