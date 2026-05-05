import { useNavigate } from 'react-router-dom'
import { Shield, Radio, Brain } from 'lucide-react'
import Hero from '@/components/ui/animated-shader-hero'
import { ShuffleFeatureCards } from '@/components/ui/feature-cards'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      {/* Navigation */}
      <nav className="landing__nav" style={{ zIndex: 100 }}>
        <div className="landing__nav-inner container">
          <div className="landing__logo">
            <img 
              src="/main logo-png.png" 
              alt="Suraksha.pro" 
              style={{ height: '32px', width: 'auto', marginRight: '10px' }}
            />
            <span className="landing__logo-text">Suraksha<span className="text-gold">.pro</span></span>
          </div>
          <div className="landing__nav-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/auth')}>Login</button>
            <button className="btn btn-gold btn-sm" onClick={() => navigate('/auth')}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <Hero
        trustBadge={{
          text: "Trusted by forward-thinking teams.",
          icons: ["✨"]
        }}
        headline={{
          line1: "From Chaos",
          line2: "to Command"
        }}
        subtitle="A real-time crowd control tower that predicts danger and coordinates response before chaos begins. 60 seconds of earlier warning is the difference between prevention and tragedy."
        buttons={{
          primary: {
            text: "Get Started",
            onClick: () => navigate('/auth?mode=signup')
          },
          secondary: {
            text: "Explore Features",
            onClick: () => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
            }
          }
        }}
      />

      {/* Features */}
      <section className="landing__section" id="features">
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 className="landing__section-title heading-display" style={{ marginBottom: '1rem' }}>Key Features</h2>
          <p className="text-secondary" style={{ marginBottom: '1rem', fontSize: '1.125rem', textAlign: 'center' }}>Swipe through our interactive feature cards.</p>
          <ShuffleFeatureCards 
            features={[
              { id: 1, icon: '🗺️', title: 'Live Zone Heatmap', description: 'See every zone at a glance with color-coded risk status updating every 5 seconds.' },
              { id: 2, icon: '🧠', title: 'Risk Detection Engine', description: 'Automatic detection of surge, bottleneck, and stampede risk patterns with actionable recommendations.' },
              { id: 3, icon: '📡', title: 'WebRTC Walkie-Talkie', description: 'Push-to-talk voice channels — global and per-zone — with sub-500ms latency.' },
              { id: 4, icon: '🚨', title: 'Smart Alert System', description: 'Priority-based alerts with audio, vibration, and full-screen notifications for critical situations.' },
              { id: 5, icon: '📱', title: 'Steward Mobile App', description: 'Gloves-friendly interface with 1-tap status reports and large touch targets.' },
              { id: 6, icon: '📊', title: 'Event Analytics', description: 'Complete event timeline, risk history, and staff activity logs for post-event review.' },
            ]}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="landing__footer">
        <div className="container">
          <div className="landing__footer-inner">
            <div className="landing__footer-brand">
              <img 
                src="/main logo-png.png" 
                alt="Suraksha.pro" 
                style={{ height: '24px', width: 'auto', marginRight: '8px' }}
              />
              <span>Suraksha<span className="text-gold">.pro</span></span>
            </div>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              © 2026 Suraksha.pro — Real-time crowd safety platform
            </p>
            <div className="landing__footer-links">
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth')}>Login</button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth?mode=signup')}>Sign Up</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
