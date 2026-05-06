import { useState, useEffect } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'
import { Users, Trash2, Copy, Check, UserPlus, Shield, MapPin, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '@/contexts/LanguageContext'
import RealtimeStatus from '@/components/RealtimeStatus'

export default function ManagerCoordinators() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { activeEvent, zones, staff, loadEvent } = useEventStore()
  const { t } = useLang()

  const [loading, setLoading] = useState(!activeEvent)
  const [pinCopied, setPinCopied] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    if (activeEvent) { setLoading(false); return }
    if (!profile) { setLoading(false); return }
    const load = async () => {
      const { data: events } = await supabase
        .from('events').select('*')
        .eq('admin_id', profile.id)
        .in('status', ['ACTIVE', 'PAUSED', 'DRAFT'])
        .order('created_at', { ascending: false }).limit(1)
      if (events && events.length > 0) await loadEvent(events[0].id)
      setLoading(false)
    }
    load()
  }, [profile?.id, activeEvent?.id])

  const coordinators = staff.filter(s => s.role === 'COORDINATOR')

  const getZoneLabel = (zoneId: string | null) => {
    if (!zoneId) return 'Global'
    const z = zones.find(z => z.id === zoneId)
    return z ? `${z.label}${z.name ? ` · ${z.name}` : ''}` : 'Unknown'
  }

  const handleCopyPin = () => {
    if (!activeEvent?.pin) return
    navigator.clipboard.writeText(activeEvent.pin)
    setPinCopied(true)
    setTimeout(() => setPinCopied(false), 2000)
  }

  const handleRemove = async () => {
    if (!confirmRemove) return
    setRemoving(true)
    try {
      const { error } = await supabase
        .from('event_staff')
        .update({ left_at: new Date().toISOString() })
        .eq('id', confirmRemove.id)
      if (error) throw error
      // Refresh staff list from DB
      if (activeEvent) await loadEvent(activeEvent.id)
      setConfirmRemove(null)
    } catch (err: any) {
      alert(err.message || 'Failed to remove coordinator')
    } finally {
      setRemoving(false)
    }
  }

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
            <h2 className="v-text-title" style={{ fontSize: '24px' }}>{t('mgrNoEvent')}</h2>
            <p className="text-secondary mb-6">{t('mgrCreateEvent')}</p>
            <button className="btn" onClick={() => navigate('/event/create')} style={{ background: 'var(--v-orange)', color: '#fff', border: 'none' }}>
              {t('mgrCreateBtn')}
            </button>
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
            <Users size={18} style={{ color: 'var(--v-orange)' }} />
            <span style={{ fontWeight: 600 }}>{activeEvent.name} — {t('mgrCoordinatorsHeader')}</span>
            {activeEvent.status === 'ACTIVE' && (
              <span className="live-indicator" style={{ marginLeft: '8px' }}>
                <span className="live-indicator__dot" /> {t('live')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <RealtimeStatus />
            <span className="v-status-pill safe" style={{ fontSize: '11px' }}>
              {coordinators.length} {t('guestAvailable')}
            </span>
          </div>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* ── Invite Card ── */}
          <div className="v-card" style={{ padding: '24px', border: '1px solid var(--v-border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 className="v-text-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={18} color="var(--v-orange)" /> {t('mgrAddCoordinators')}
                </h3>
                <p className="v-text-sm" style={{ marginTop: '6px', opacity: 0.6, maxWidth: '480px' }}>
                  {t('mgrInviteText')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'var(--v-bg-dark)', border: '1px solid var(--v-border)',
                borderRadius: '14px', padding: '14px 24px',
                display: 'flex', alignItems: 'center', gap: '16px',
              }}>
                <div>
                  <div className="v-text-sm" style={{ opacity: 0.5, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '10px' }}>Event PIN</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '32px', fontWeight: 800, letterSpacing: '6px', color: 'var(--v-orange)' }}>
                    {activeEvent.pin || '------'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCopyPin}
                className="btn"
                style={{
                  background: pinCopied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${pinCopied ? 'rgba(34,197,94,0.4)' : 'var(--v-border)'}`,
                  color: pinCopied ? '#4ade80' : 'var(--v-text)',
                  gap: '8px', padding: '12px 20px', transition: 'all 0.2s',
                }}
              >
                {pinCopied ? <Check size={16} /> : <Copy size={16} />}
                {pinCopied ? 'Copied!' : 'Copy PIN'}
              </button>
            </div>

            <div style={{
              marginTop: '16px', padding: '12px 16px',
              background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: '12px', fontSize: '13px', color: 'rgba(245,236,213,0.6)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Shield size={14} style={{ color: 'var(--v-orange)', flexShrink: 0 }} />
              Coordinators joining with this PIN will only have access to their assigned zone's data and the coordinator dashboard.
            </div>
          </div>

          {/* ── Coordinator List ── */}
          <div className="v-card" style={{ padding: '24px', border: '1px solid var(--v-border)' }}>
            <h3 className="v-text-title" style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="var(--v-orange)" />
              {t('mgrActiveCoordinators')}
              <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 400, opacity: 0.5 }}>
                {coordinators.length} {t('mgrCoordinatorsHeader')}
              </span>
            </h3>

            {coordinators.length === 0 ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                border: '1px dashed var(--v-border)', borderRadius: '16px',
              }}>
                <Users size={40} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <p className="v-text-title" style={{ marginBottom: '8px' }}>{t('mgrNoCoordinators')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {coordinators.map(s => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 18px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '14px',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                  >
                    {/* Avatar */}
                    <div className="v-avatar" style={{ width: '40px', height: '40px', fontSize: '14px', flexShrink: 0 }}>
                      {(s.display_name || 'C').substring(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
                        {s.display_name || 'Unnamed Coordinator'}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', opacity: 0.5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={11} /> {getZoneLabel(s.zone_id)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> Joined {new Date(s.joined_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Zone pill */}
                    <span className="v-status-pill" style={{
                      fontSize: '10px', background: 'rgba(212,175,55,0.1)',
                      color: 'var(--v-orange)', border: '1px solid rgba(212,175,55,0.2)',
                    }}>
                      COORDINATOR
                    </span>

                    {/* Remove button */}
                    <button
                      onClick={() => setConfirmRemove({ id: s.id, name: s.display_name || 'this coordinator' })}
                      style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#ff4d4d', borderRadius: '10px', padding: '8px 10px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', fontWeight: 600, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.18)'
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
                      }}
                    >
                      <Trash2 size={14} /> {t('mgrRemoveCoordinator')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Remove Confirmation Modal */}
      {confirmRemove && (
        <div className="modal-overlay" onClick={() => !removing && setConfirmRemove(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{
            background: 'var(--v-card-bg)', border: '1px solid rgba(255,77,77,0.25)',
            borderRadius: '24px', maxWidth: '400px',
          }}>
            <div className="modal__header" style={{ borderBottom: '1px solid var(--v-border)' }}>
              <h2 className="modal__title" style={{ color: '#ff4d4d', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trash2 size={20} /> {t('mgrRemoveCoordinator')}
              </h2>
            </div>
            <div className="modal__body">
              <p style={{ marginBottom: '12px' }}>{t('mgrConfirmRemoveCoord')}</p>
              <div style={{
                background: 'rgba(255,77,77,0.07)', border: '1px solid rgba(255,77,77,0.18)',
                borderRadius: '12px', padding: '14px 18px', marginBottom: '16px',
              }}>
                <strong style={{ fontSize: '17px' }}>{confirmRemove.name}</strong>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--v-text-muted)', lineHeight: 1.6 }}>
                This coordinator will lose access to the event dashboard immediately. They can rejoin using the event PIN if needed.
              </p>
            </div>
            <div className="modal__footer">
              <button
                className="btn" style={{ background: 'transparent' }}
                onClick={() => setConfirmRemove(null)} disabled={removing}
              >
                {t('cancel')}
              </button>
              <button
                className="btn"
                style={{ background: '#ef4444', color: 'white', border: 'none', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
                onClick={handleRemove} disabled={removing}
              >
                {removing ? t('loading') : '🗑 ' + t('mgrRemoveCoordinator')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
