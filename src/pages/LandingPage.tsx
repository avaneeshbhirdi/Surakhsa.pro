import { useNavigate } from 'react-router-dom'
import { Shield, Radio, Brain, ArrowRight, ChevronDown } from 'lucide-react'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      {/* Navigation */}
      <nav className="landing__nav">
        <div className="landing__nav-inner container">
          <div className="landing__logo">
            <Shield size={24} className="text-gold" />
            <span className="landing__logo-text">Suraksha<span className="text-gold">.pro</span></span>
          </div>
          <div className="landing__nav-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/auth')}>Login</button>
            <button className="btn btn-gold btn-sm" onClick={() => navigate('/auth')}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing__hero" id="hero">
        <div className="landing__hero-bg" />
        <div className="landing__hero-content container">
          <div className="landing__hero-badge">
            <span className="live-indicator">
              <span className="live-indicator__dot" />
              Real-time Crowd Safety
            </span>
          </div>
          <h1 className="landing__hero-title heading-display">
            From Chaos<br />to <span className="text-gold">Command</span>
          </h1>
          <p className="landing__hero-subtitle">
            A real-time crowd control tower that predicts danger and coordinates response before chaos begins.
            60 seconds of earlier warning is the difference between prevention and tragedy.
          </p>
          <div className="landing__hero-ctas">
            <button className="btn btn-gold btn-lg" onClick={() => navigate('/auth?mode=signup')}>
              Create Event <ArrowRight size={18} />
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/auth?mode=pin')}>
              Join with PIN
            </button>
          </div>
          <div className="landing__hero-scroll">
            <ChevronDown size={24} className="text-secondary" />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="landing__section" id="problem">
        <div className="container">
          <h2 className="landing__section-title heading-display">Why This Matters</h2>
          <p className="landing__section-subtitle text-secondary">
            Crowd tragedies share one root cause: too little warning, too late.
          </p>
          <div className="landing__problem-grid">
            {[
              { year: '2021', title: 'Astroworld Festival', desc: 'Density thresholds crossed before anyone noticed. No early warning system in place.' },
              { year: 'Recurring', title: 'Hajj Stampedes', desc: 'Security, medics, and command weren\'t on the same page. Siloed communication.' },
              { year: '2010', title: 'Love Parade', desc: 'By the time the right person was informed, critical minutes were lost. Slow response.' },
            ].map((item, i) => (
              <div key={i} className="landing__problem-card card-glass">
                <span className="landing__problem-year">{item.year}</span>
                <h3 className="landing__problem-title">{item.title}</h3>
                <p className="landing__problem-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing__section landing__section--dark" id="how">
        <div className="container">
          <h2 className="landing__section-title heading-display">How It Works</h2>
          <div className="landing__steps">
            {[
              { step: '01', icon: <Shield size={32} />, title: 'Monitor', desc: 'Real-time density tracking across all event zones with live heatmap visualization.' },
              { step: '02', icon: <Brain size={32} />, title: 'Detect', desc: 'AI-powered risk detection identifies surges, bottlenecks, and stampede patterns 60 seconds early.' },
              { step: '03', icon: <Radio size={32} />, title: 'Respond', desc: 'Instant push-to-talk communication and automated alerts reach the right people immediately.' },
            ].map((item, i) => (
              <div key={i} className="landing__step">
                <div className="landing__step-number">{item.step}</div>
                <div className="landing__step-icon text-gold">{item.icon}</div>
                <h3 className="landing__step-title">{item.title}</h3>
                <p className="landing__step-desc text-secondary">{item.desc}</p>
                {i < 2 && <div className="landing__step-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing__section" id="features">
        <div className="container">
          <h2 className="landing__section-title heading-display">Key Features</h2>
          <div className="landing__features-grid">
            {[
              { icon: '🗺️', title: 'Live Zone Heatmap', desc: 'See every zone at a glance with color-coded risk status updating every 5 seconds.' },
              { icon: '🧠', title: 'Risk Detection Engine', desc: 'Automatic detection of surge, bottleneck, and stampede risk patterns with actionable recommendations.' },
              { icon: '📡', title: 'WebRTC Walkie-Talkie', desc: 'Push-to-talk voice channels — global and per-zone — with sub-500ms latency.' },
              { icon: '🚨', title: 'Smart Alert System', desc: 'Priority-based alerts with audio, vibration, and full-screen notifications for critical situations.' },
              { icon: '📱', title: 'Steward Mobile App', desc: 'Gloves-friendly interface with 1-tap status reports and large touch targets.' },
              { icon: '📊', title: 'Event Analytics', desc: 'Complete event timeline, risk history, and staff activity logs for post-event review.' },
            ].map((item, i) => (
              <div key={i} className="landing__feature-card card-glass">
                <span className="landing__feature-icon">{item.icon}</span>
                <h3 className="landing__feature-title">{item.title}</h3>
                <p className="landing__feature-desc text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing__footer">
        <div className="container">
          <div className="landing__footer-inner">
            <div className="landing__footer-brand">
              <Shield size={20} className="text-gold" />
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
