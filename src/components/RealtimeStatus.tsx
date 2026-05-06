import { useEventStore } from '@/stores/eventStore'

export default function RealtimeStatus() {
  const realtimeStatus = useEventStore(s => s.realtimeStatus)

  const config = {
    connected: {
      dot: '#22c55e',
      label: 'Live',
      bg: 'rgba(34,197,94,0.12)',
      border: 'rgba(34,197,94,0.3)',
      color: '#22c55e',
      pulse: true,
    },
    connecting: {
      dot: '#f59e0b',
      label: 'Connecting…',
      bg: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.3)',
      color: '#f59e0b',
      pulse: false,
    },
    disconnected: {
      dot: '#ef4444',
      label: 'Offline',
      bg: 'rgba(239,68,68,0.12)',
      border: 'rgba(239,68,68,0.3)',
      color: '#ef4444',
      pulse: false,
    },
  }[realtimeStatus]

  return (
    <div
      title={`Realtime: ${realtimeStatus}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '999px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        fontSize: '11px',
        fontWeight: 600,
        color: config.color,
        userSelect: 'none',
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: config.dot,
          flexShrink: 0,
          animation: config.pulse ? 'realtime-pulse 2s ease-in-out infinite' : 'none',
        }}
      />
      {config.label}
      <style>{`
        @keyframes realtime-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 ${config.dot}66; }
          50% { opacity: 0.7; box-shadow: 0 0 0 4px ${config.dot}00; }
        }
      `}</style>
    </div>
  )
}
