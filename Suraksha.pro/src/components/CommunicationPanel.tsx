import { useState } from 'react'
import { Mic, MicOff, Radio } from 'lucide-react'
import type { Zone } from '@/lib/types'

interface CommunicationPanelProps {
  zones: Zone[]
  onSendInstruction?: (zoneId: string | null, message: string) => void
}

export default function CommunicationPanel({ zones, onSendInstruction }: CommunicationPanelProps) {
  const [activeChannel, setActiveChannel] = useState<string>('global')
  const [isPTTActive, setIsPTTActive] = useState(false)
  const [instructionText, setInstructionText] = useState('')

  const channels = [
    { id: 'global', name: 'Global', icon: <Radio size={14} /> },
    ...zones.map(z => ({ id: z.id, name: `Zone ${z.label}`, icon: null })),
  ]

  const handleSendInstruction = () => {
    if (!instructionText.trim() || !onSendInstruction) return
    const zoneId = activeChannel === 'global' ? null : activeChannel
    onSendInstruction(zoneId, instructionText)
    setInstructionText('')
  }

  return (
    <div>
      <h3 className="heading-section mb-4" style={{ fontSize: 'var(--text-base)' }}>
        <Radio size={16} className="text-gold" style={{ display: 'inline', marginRight: 'var(--space-2)' }} />
        Communication
      </h3>

      {/* Channel List */}
      <div className="flex flex-col gap-1 mb-4" style={{ maxHeight: '160px', overflowY: 'auto' }}>
        {channels.map(ch => (
          <button
            key={ch.id}
            className={`btn btn-sm w-full ${activeChannel === ch.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveChannel(ch.id)}
            style={{ justifyContent: 'flex-start', fontSize: 'var(--text-xs)' }}
          >
            {ch.icon} {ch.name}
          </button>
        ))}
      </div>

      {/* PTT Button */}
      <div className="flex flex-center mb-4">
        <button
          className={`ptt-button ${isPTTActive ? 'ptt-button--transmitting' : ''}`}
          onMouseDown={() => setIsPTTActive(true)}
          onMouseUp={() => setIsPTTActive(false)}
          onMouseLeave={() => setIsPTTActive(false)}
          onTouchStart={() => setIsPTTActive(true)}
          onTouchEnd={() => setIsPTTActive(false)}
        >
          {isPTTActive ? <MicOff size={28} className="ptt-button__icon" /> : <Mic size={28} className="ptt-button__icon" />}
        </button>
      </div>
      <p className="text-center text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)' }}>
        {isPTTActive ? 'Transmitting...' : 'Hold to talk'}
      </p>

      {/* Text Instruction */}
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Send instruction..."
          value={instructionText}
          onChange={e => setInstructionText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendInstruction()}
          style={{ fontSize: 'var(--text-sm)' }}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSendInstruction} disabled={!instructionText.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
