import { useEffect } from 'react'
import './SplashScreen.css'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const handleTap = () => onComplete()
    window.addEventListener('click', handleTap)
    window.addEventListener('touchstart', handleTap)
    return () => {
      window.removeEventListener('click', handleTap)
      window.removeEventListener('touchstart', handleTap)
    }
  }, [onComplete])

  return (
    <div className="splash">
      <div className="splash__bg-grid" />
      <div className="splash__content">
        <div className="splash__logo-container">
          <div className="splash__shield">
            <svg width="80" height="90" viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M40 5L5 20V45C5 67 20 82 40 88C60 82 75 67 75 45V20L40 5Z"
                stroke="var(--color-gold)" strokeWidth="3" fill="none" className="splash__shield-path" />
              <path d="M40 15L15 27V45C15 62 27 74 40 80C53 74 65 62 65 45V27L40 15Z"
                fill="var(--color-maroon-dark)" opacity="0.5" />
              <path d="M35 45L28 38L25 41L35 51L55 31L52 28L35 45Z"
                fill="var(--color-gold)" className="splash__check" />
            </svg>
          </div>
          <h1 className="splash__title">Suraksha<span className="splash__title-dot">.pro</span></h1>
        </div>
        <p className="splash__tagline">Prevent. Don't React.</p>
        <div className="splash__heatmap-pulse" />
      </div>
      <p className="splash__hint">Tap anywhere to continue</p>
    </div>
  )
}
