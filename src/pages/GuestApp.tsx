import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, MapPin, LogOut,
  Users, Activity, Megaphone, ShieldCheck, Clock,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import { useLang } from '@/contexts/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import './GuestApp.css'

export default function GuestApp() {
  const { logout, pinSession } = useAuthStore()
  const { zones, alerts, latestReadings, loadEvent, activeEvent } = useEventStore()
  const { t } = useLang()

  useEffect(() => {
    if (pinSession?.eventId) loadEvent(pinSession.eventId)
  }, [pinSession?.eventId])



  // Overall crowd level
  const totalPeople = Object.values(latestReadings).reduce((acc, r) => acc + (r.density || 0), 0)
  const totalCap = zones.reduce((acc, z) => acc + z.capacity, 0)
  const overallPct = totalCap > 0 ? Math.min(100, Math.round((totalPeople / totalCap) * 100)) : 0
  const overallStatus = overallPct >= 85 ? t('guestCrowded') : overallPct >= 60 ? t('guestModerate') : t('guestComfortable')
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LanguageSwitcher compact />
          <button className="g-logout-btn" onClick={() => logout()} title={t('logout')} style={{ margin: 0 }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="g-content">

        {/* ── Hero Status Banner ── */}
        <div className="g-hero" style={{ borderColor: overallColor + '44', background: `linear-gradient(135deg, ${overallColor}11 0%, ${overallColor}05 100%)` }}>
          <div className="g-hero-left">
            <div className="g-hero-label">{t('guestVenueStatus')}</div>
            <div className="g-hero-status" style={{ color: overallColor }}>{overallStatus}</div>
            <div className="g-hero-sub">{totalPeople.toLocaleString()} {t('guestPeople')} · {overallPct}% {t('guestCapacity')}</div>
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

        {/* ── Active Alerts strip ── */}
        {activeAlerts.length > 0 && (
          <div className="g-alert-strip">
            <AlertTriangle size={15} className="g-alert-strip-icon" />
            <span><strong>{activeAlerts.length} {activeAlerts.length > 1 ? t('guestActiveAlertsPlural') : t('guestActiveAlerts')}</strong> — {t('guestFollowStaff')}</span>
          </div>
        )}

        {/* ── Zone Cards ── */}
        <section>
          <div className="g-section-header">
            <MapPin size={14} />
            <span>{t('guestZoneOccupancy')}</span>
          </div>
          <div className="g-zones-grid">
            {zones.length === 0 ? (
              <div className="g-empty">{t('guestNoZones')}</div>
            ) : zones.map(z => {
              const reading = latestReadings[z.id]
              const pct = z.capacity > 0 ? Math.min(100, Math.round(((reading?.density || 0) / z.capacity) * 100)) : 0
              const color = pct >= 85 ? '#ef4444' : pct >= 60 ? '#f97316' : '#22c55e'
              const label = pct >= 85 ? t('guestCrowded') : pct >= 60 ? t('guestFillingUp') : t('guestAvailable')

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
                    <span><Users size={11} /> {reading?.density || 0} {t('guestPeople')}</span>
                    <span><Activity size={11} /> {t('guestRisk')}: {reading?.risk_score || 0}</span>
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
            <span>{t('guestAnnouncements')}</span>
          </div>
          <div className="g-announcements">
            {alerts.length === 0 ? (
              <div className="g-empty">{t('guestNoAnnouncements')}</div>
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
                    {isUrgent && <span className="g-announce-badge">{t('guestUrgent')}</span>}
                  </motion.div>
                )
              })
            )}
          </div>
        </section>

        {/* ── Safety Tips ── */}
        <div className="g-safety-tip">
          <ShieldCheck size={15} />
          <span>{t('guestSafetyTip')}</span>
        </div>
      </main>
    </div>
  )
}
