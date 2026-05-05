import type { Alert } from '@/lib/types'
import { Check, CheckCheck } from 'lucide-react'

interface AlertCardProps {
  alert: Alert
  onAcknowledge?: () => void
  onResolve?: () => void
}

export default function AlertCard({ alert, onAcknowledge, onResolve }: AlertCardProps) {
  const priorityClass = alert.priority === 'CRITICAL' ? 'alert-card--critical'
    : alert.priority === 'HIGH' ? 'alert-card--high'
    : ''
  const unreadClass = alert.status === 'TRIGGERED' ? 'alert-card--unread' : ''
  const priorityBadge = alert.priority === 'CRITICAL' ? 'badge-danger'
    : alert.priority === 'HIGH' ? 'badge-danger'
    : alert.priority === 'MEDIUM' ? 'badge-warning'
    : 'badge-safe'

  const timeStr = new Date(alert.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className={`alert-card ${priorityClass} ${unreadClass}`}>
      <div className="alert-card__header">
        <div>
          <span className="alert-card__zone">
            {alert.priority === 'CRITICAL' ? '🔴' : alert.priority === 'HIGH' ? '🟠' : '🟡'}{' '}
            Zone — {alert.risk_type.replace('_', ' ')}
          </span>
          <div className="alert-card__type">
            Risk Score: {alert.risk_score} &bull; {alert.priority}
          </div>
        </div>
        <span className={`badge ${priorityBadge}`}>{alert.status}</span>
      </div>

      <p className="alert-card__message">{alert.message}</p>

      {alert.recommended_action && (
        <p className="alert-card__action">► {alert.recommended_action}</p>
      )}

      <div className="alert-card__footer">
        <span className="alert-card__time">{timeStr}</span>
        <div className="flex gap-2">
          {alert.status === 'TRIGGERED' && onAcknowledge && (
            <button className="btn btn-outline btn-sm" onClick={onAcknowledge}>
              <Check size={14} /> Acknowledge
            </button>
          )}
          {alert.status === 'ACKNOWLEDGED' && onResolve && (
            <button className="btn btn-primary btn-sm" onClick={onResolve}>
              <CheckCheck size={14} /> Resolve
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
