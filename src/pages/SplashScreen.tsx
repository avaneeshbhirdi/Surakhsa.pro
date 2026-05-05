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
          <img 
            src="/main logo-png.png" 
            alt="Suraksha.pro Logo" 
            className="splash__logo-img"
            style={{ width: '150px', height: 'auto', marginBottom: 'var(--space-6)' }}
          />
          <h1 className="splash__title">Suraksha<span className="splash__title-dot">.pro</span></h1>
        </div>
        <p className="splash__tagline">Prevent. Don't React.</p>
        <div className="splash__heatmap-pulse" />
      </div>
      <p className="splash__hint">Tap anywhere to continue</p>
    </div>
  )
}
