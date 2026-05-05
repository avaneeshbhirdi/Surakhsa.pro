import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Zone, ZoneReading, Alert } from '@/lib/types'
import { X, Mic } from 'lucide-react'

interface ZoneDetailModalProps {
  zone: Zone
  reading?: ZoneReading
  onClose: () => void
}

export default function ZoneDetailModal({ zone, reading, onClose }: ZoneDetailModalProps) {
  const [recentReadings, setRecentReadings] = useState<ZoneReading[]>([])
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])

  useEffect(() => {
    loadData()
  }, [zone.id])

  const loadData = async () => {
    const [readingsRes, alertsRes] = await Promise.all([
      supabase.from('zone_readings').select('*').eq('zone_id', zone.id).order('recorded_at', { ascending: false }).limit(12),
      supabase.from('alerts').select('*').eq('zone_id', zone.id).order('triggered_at', { ascending: false }).limit(5),
    ])
    setRecentReadings(readingsRes.data || [])
    setRecentAlerts(alertsRes.data || [])
  }

  const percentage = zone.capacity > 0 ? Math.min(100, Math.round(((reading?.density || 0) / zone.capacity) * 100)) : 0
  const riskScore = reading?.risk_score || 0
  const colorState = reading?.color_state || 'GREEN'
  const riskColor = colorState === 'RED' ? 'var(--color-danger-pulse)' : colorState === 'YELLOW' ? 'var(--color-warning)' : 'var(--color-safe)'

  // SVG arc for risk gauge
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (riskScore / 100) * circumference

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal__header">
          <h2 className="modal__title">Zone {zone.label}{zone.name ? ` — ${zone.name}` : ''}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal__body">
          {/* Risk Gauge */}
          <div className="flex flex-center mb-6">
            <svg width="130" height="130" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" stroke="var(--color-bg-elevated)" strokeWidth="8" fill="none" />
              <circle
                cx="50" cy="50" r="45"
                stroke={riskColor}
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 500ms ease' }}
              />
              <text x="50" y="46" textAnchor="middle" fill={riskColor} fontSize="24" fontWeight="bold">{riskScore}</text>
              <text x="50" y="62" textAnchor="middle" fill="var(--color-text-muted)" fontSize="10">RISK</text>
            </svg>
          </div>

          {/* Current Metrics */}
          <div className="grid grid-2 gap-3 mb-6">
            <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Density</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>
                {percentage}%
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {Math.round(reading?.density || 0)} / {zone.capacity}
              </div>
            </div>
            <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Flow Rate</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>
                {(reading?.flow_rate || 0).toFixed(1)}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>m/min</div>
            </div>
          </div>

          {reading?.risk_type && reading.risk_type !== 'NORMAL' && (
            <div className="card mb-4" style={{ padding: 'var(--space-3)', borderLeft: `3px solid ${riskColor}` }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: riskColor }}>
                ⚠ {reading.risk_type.replace('_', ' ')}
              </span>
              <span className="badge" style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
                {reading.confidence} confidence
              </span>
            </div>
          )}

          {/* Density History (simple bar chart) */}
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
            Recent Readings
          </h4>
          <div className="flex gap-1 mb-6" style={{ alignItems: 'flex-end', height: '60px' }}>
            {[...recentReadings].reverse().map((r, i) => {
              const h = zone.capacity > 0 ? Math.max(4, (r.density / zone.capacity) * 60) : 4
              const barColor = r.color_state === 'RED' ? 'var(--color-danger)' : r.color_state === 'YELLOW' ? 'var(--color-warning)' : 'var(--color-safe)'
              return <div key={i} style={{ flex: 1, height: `${h}px`, background: barColor, borderRadius: '2px 2px 0 0', transition: 'height 300ms' }} />
            })}
          </div>

          {/* Recent Alerts */}
          {recentAlerts.length > 0 && (
            <>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                Recent Alerts
              </h4>
              <div className="flex flex-col gap-2">
                {recentAlerts.map(a => (
                  <div key={a.id} style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2)', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                    <span className={`badge badge-${a.priority === 'HIGH' || a.priority === 'CRITICAL' ? 'danger' : 'warning'}`} style={{ marginRight: 'var(--space-2)' }}>
                      {a.risk_type}
                    </span>
                    {new Date(a.triggered_at).toLocaleTimeString()}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn-outline btn-sm">
            <Mic size={14} /> Talk to Zone
          </button>
          <button className="btn btn-primary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
