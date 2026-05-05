import { Users, AlertTriangle, Activity, Radio } from 'lucide-react'
import type { Zone, ZoneReading, Alert, EventStaff } from '@/lib/types'

interface MetricsPanelProps {
  zones: Zone[]
  latestReadings: Record<string, ZoneReading>
  alerts: Alert[]
  staff: EventStaff[]
}

export default function MetricsPanel({ zones, latestReadings, alerts, staff }: MetricsPanelProps) {
  const totalDensity = Object.values(latestReadings).reduce((sum, r) => sum + r.density, 0)
  const activeAlerts = alerts.filter(a => a.status !== 'RESOLVED').length
  const onlineStaff = staff.filter(s => s.is_online).length

  // Find highest risk zone
  let highestRiskZone = ''
  let highestRisk = 0
  zones.forEach(z => {
    const reading = latestReadings[z.id]
    if (reading && reading.risk_score > highestRisk) {
      highestRisk = reading.risk_score
      highestRiskZone = `Zone ${z.label}`
    }
  })

  const metrics = [
    {
      icon: <Users size={20} />,
      label: 'Est. Headcount',
      value: Math.round(totalDensity).toLocaleString(),
      color: 'var(--color-gold)',
    },
    {
      icon: <AlertTriangle size={20} />,
      label: 'Active Alerts',
      value: activeAlerts.toString(),
      color: activeAlerts > 0 ? 'var(--color-danger-pulse)' : 'var(--color-safe)',
    },
    {
      icon: <Activity size={20} />,
      label: 'Highest Risk',
      value: highestRiskZone || 'None',
      sub: highestRisk > 0 ? `Score: ${highestRisk}` : '',
      color: highestRisk >= 70 ? 'var(--color-danger-pulse)' : highestRisk >= 40 ? 'var(--color-warning)' : 'var(--color-safe)',
    },
    {
      icon: <Radio size={20} />,
      label: 'Staff Online',
      value: onlineStaff.toString(),
      color: 'var(--color-gold)',
    },
  ]

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)' }}>
      {metrics.map((m, i) => (
        <div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
          <div className="flex gap-2 mb-2" style={{ alignItems: 'center', color: m.color }}>
            {m.icon}
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{m.label}</span>
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: m.color }}>
            {m.value}
          </div>
          {m.sub && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
              {m.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
