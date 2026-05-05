import { useState } from 'react'
import type { Alert } from '@/lib/types'
import AlertCard from './AlertCard'

interface AlertFeedProps {
  alerts: Alert[]
  onAcknowledge: (alertId: string) => void
  onResolve: (alertId: string) => void
}

type FilterType = 'all' | 'unresolved' | 'critical'

export default function AlertFeed({ alerts, onAcknowledge, onResolve }: AlertFeedProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = alerts.filter(a => {
    if (filter === 'unresolved') return a.status !== 'RESOLVED'
    if (filter === 'critical') return a.priority === 'CRITICAL' || a.priority === 'HIGH'
    return true
  })

  return (
    <div className="alert-feed">
      <div className="flex flex-between mb-4" style={{ alignItems: 'center' }}>
        <h3 className="heading-section" style={{ fontSize: 'var(--text-base)' }}>
          Alert Feed
          {alerts.filter(a => a.status === 'TRIGGERED').length > 0 && (
            <span className="badge badge-danger" style={{ marginLeft: 'var(--space-2)' }}>
              {alerts.filter(a => a.status === 'TRIGGERED').length}
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          {(['all', 'unresolved', 'critical'] as FilterType[]).map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}
              style={{ fontSize: 'var(--text-xs)', textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <p className="text-muted text-center p-6" style={{ fontSize: 'var(--text-sm)' }}>
            No alerts{filter !== 'all' ? ` matching "${filter}"` : ''}.
          </p>
        ) : (
          filtered.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={() => onAcknowledge(alert.id)}
              onResolve={() => onResolve(alert.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
