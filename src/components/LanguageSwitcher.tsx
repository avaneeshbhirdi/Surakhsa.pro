import { useLang } from '@/contexts/LanguageContext'
import type { Lang } from '@/lib/i18n'

const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'En' },
  { code: 'hi', label: 'Hindi', native: 'हि' },
  { code: 'kn', label: 'Kannada', native: 'ಕ' },
]

interface Props {
  compact?: boolean // show only native label (for headers)
}

export default function LanguageSwitcher({ compact = false }: Props) {
  const { lang, setLang } = useLang()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2px', // Reduced gap
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '3px',
      width: '100%', // Ensure it takes full width of parent
      boxSizing: 'border-box'
    }}>
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={l.label}
          style={{
            flex: 1, // Make buttons share space evenly
            padding: compact ? '4px 2px' : '5px 2px', // Reduced horizontal padding
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            fontSize: compact ? '11px' : '12px', // Slightly smaller font
            fontWeight: lang === l.code ? 700 : 400,
            background: lang === l.code ? 'rgba(212,175,55,0.2)' : 'transparent',
            color: lang === l.code ? '#d4af37' : 'rgba(245,236,213,0.45)',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {compact ? l.native : l.label}
        </button>
      ))}
    </div>
  )
}
