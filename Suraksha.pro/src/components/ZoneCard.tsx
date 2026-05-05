import type { Zone, ZoneReading } from '@/lib/types'

interface ZoneCardProps {
  zone: Zone
  reading?: ZoneReading
  onClick?: () => void
}

export default function ZoneCard({ zone, reading, onClick }: ZoneCardProps) {
  const density = reading?.density || 0
  const capacity = zone.capacity
  const percentage = capacity > 0 ? Math.min(100, Math.round((density / capacity) * 100)) : 0
  const riskScore = reading?.risk_score || 0
  const colorState = reading?.color_state || 'GREEN'

  const stateClass = colorState === 'RED' ? 'zone-card--danger' : colorState === 'YELLOW' ? 'zone-card--warning' : 'zone-card--safe'
  const fillColor = colorState === 'RED' ? 'var(--color-danger-pulse)' : colorState === 'YELLOW' ? 'var(--color-warning)' : 'var(--color-safe)'
  const badgeClass = colorState === 'RED' ? 'badge-danger' : colorState === 'YELLOW' ? 'badge-warning' : 'badge-safe'

  return (
    <div className={`zone-card ${stateClass}`} onClick={onClick} role="button" tabIndex={0}>
      <div className="flex flex-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="zone-card__label">Zone {zone.label}</div>
          {zone.name && <div className="zone-card__name">{zone.name}</div>}
        </div>
        <span className={`badge ${badgeClass}`}>{riskScore}</span>
      </div>

      <div className="zone-card__density-bar">
        <div
          className="zone-card__density-fill"
          style={{ width: `${percentage}%`, backgroundColor: fillColor }}
        />
      </div>

      <div className="zone-card__metrics">
        <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
          {Math.round(density)}/{capacity} ({percentage}%)
        </span>
        <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
          Flow: {(reading?.flow_rate || 0).toFixed(1)} m/min
        </span>
      </div>

      {reading?.risk_type && reading.risk_type !== 'NORMAL' && (
        <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: fillColor }}>
          ⚠ {reading.risk_type.replace('_', ' ')}
        </div>
      )}
    </div>
  )
}
