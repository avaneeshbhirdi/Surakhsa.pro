import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import ManagerSidebar from '@/components/ManagerSidebar'
import { User, Calendar, Bell, Info, Edit2, Check, X } from 'lucide-react'

export default function ManagerSettings() {
  const { profile, logout, updateProfile } = useAuthStore()
  const { activeEvent } = useEventStore()
  const [notifSound, setNotifSound] = useState(true)
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editName, setEditName] = useState('')

  const handleEditClick = () => {
    setEditName(profile?.full_name || '')
    setIsEditingProfile(true)
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) return
    try {
      await updateProfile({ full_name: editName.trim() })
      setIsEditingProfile(false)
    } catch (err) {
      console.error('Failed to update profile', err)
      alert('Failed to update profile')
    }
  }

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      style={{
        width: '48px', height: '26px', borderRadius: '13px', position: 'relative', cursor: 'pointer', border: 'none',
        background: value ? 'var(--v-orange)' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: '3px', left: value ? '24px' : '3px',
        width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  )

  return (
    <div className="virtus-layout">
      <ManagerSidebar />
      <main className="virtus-main">
        <header className="virtus-header">
          <span style={{ fontWeight: 600 }}>Settings</span>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Profile Section */}
          <div className="v-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="v-text-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <User size={18} color="var(--v-orange)" /> Profile
              </h3>
              {!isEditingProfile && (
                <button 
                  onClick={handleEditClick}
                  style={{ background: 'transparent', border: '1px solid var(--v-border)', borderRadius: '6px', color: 'var(--v-text-main)', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--v-bg-dark)', borderRadius: '12px', border: '1px solid var(--v-border)' }}>
              <div className="v-avatar" style={{ width: '52px', height: '52px', fontSize: '20px', flexShrink: 0 }}>
                {(profile?.full_name || 'M').substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                {isEditingProfile ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--v-orange)', color: '#fff', borderRadius: '6px', padding: '6px 10px', fontSize: '14px', width: '100%', outline: 'none' }}
                    />
                    <button onClick={handleSaveProfile} style={{ background: '#4dff4d20', border: 'none', color: '#4dff4d', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}><Check size={16} /></button>
                    <button onClick={() => setIsEditingProfile(false)} style={{ background: '#ff4d4d20', border: 'none', color: '#ff4d4d', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
                  </div>
                ) : (
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>{profile?.full_name || 'Manager'}</div>
                )}
                <div className="v-text-sm" style={{ opacity: 0.6, marginTop: '4px' }}>{profile?.role?.replace('_', ' ') || 'Event Manager'}</div>
                <div className="v-text-sm" style={{ opacity: 0.4, marginTop: '2px' }}>{profile?.id?.substring(0, 12)}...</div>
              </div>
            </div>
          </div>

          {/* Active Event Section */}
          <div className="v-card">
            <h3 className="v-text-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--v-orange)" /> Active Event
            </h3>
            {activeEvent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Event Name', value: activeEvent.name },
                  { label: 'Venue', value: activeEvent.venue_name || '—' },
                  { label: 'Status', value: activeEvent.status },
                  { label: 'PIN', value: activeEvent.pin },
                  { label: 'Capacity', value: activeEvent.total_capacity.toLocaleString() },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--v-bg-dark)', borderRadius: '10px', border: '1px solid var(--v-border)' }}>
                    <span className="v-text-sm" style={{ opacity: 0.6 }}>{r.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{r.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="v-text-sm" style={{ opacity: 0.4, textAlign: 'center', padding: '30px' }}>No active event</p>
            )}
          </div>

          {/* Notification Preferences */}
          <div className="v-card">
            <h3 className="v-text-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="var(--v-orange)" /> Notification Preferences
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Alert Sound Effects', sub: 'Play audio cue when alert is triggered', value: notifSound, toggle: () => setNotifSound(v => !v) },
                { label: 'Critical Alerts Only', sub: 'Only notify for CRITICAL severity alerts', value: criticalOnly, toggle: () => setCriticalOnly(v => !v) },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--v-bg-dark)', borderRadius: '12px', border: '1px solid var(--v-border)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{s.label}</div>
                    <div className="v-text-sm" style={{ opacity: 0.5 }}>{s.sub}</div>
                  </div>
                  <Toggle value={s.value} onChange={s.toggle} />
                </div>
              ))}
            </div>
          </div>

          {/* App Info */}
          <div className="v-card">
            <h3 className="v-text-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={18} color="var(--v-orange)" /> About
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'App', value: 'Suraksha.pro' },
                { label: 'Version', value: '1.0.0' },
                { label: 'Build', value: 'Vite + React + Supabase' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--v-bg-dark)', borderRadius: '10px', border: '1px solid var(--v-border)' }}>
                  <span className="v-text-sm" style={{ opacity: 0.6 }}>{r.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => logout()}
              style={{ marginTop: '24px', width: '100%', padding: '12px', background: '#ff4d4d20', border: '1px solid #ff4d4d50', color: '#ff4d4d', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
            >
              Logout
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
