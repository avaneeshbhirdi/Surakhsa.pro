import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Hero from '@/components/ui/animated-shader-hero'
import { ShuffleFeatureCards } from '@/components/ui/feature-cards'
import { 
  Map as MapIcon, 
  Brain, 
  Radio, 
  Bell, 
  Smartphone, 
  BarChart3 
} from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuthStore()
  const { t } = useLang()

  const getDashboardRoute = () => {
    if (role === 'ADMIN') return '/dashboard'
    if (role === 'EVENT_MANAGER') return '/manager'
    if (role === 'COORDINATOR') return '/coordinator'
    if (role === 'GUEST') return '/guest'
    return '/'
  }

  return (
    <div className="landing">
      {/* Navigation */}
      <nav className="landing__nav" style={{ zIndex: 100 }}>
        <div className="landing__nav-inner container">
          <div 
            className="landing__logo" 
            onClick={() => isAuthenticated ? navigate(getDashboardRoute()) : window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ cursor: 'pointer' }}
          >
            <img 
              src="/main logo-png.png" 
              alt="Suraksha.pro" 
              style={{ height: '32px', width: 'auto', marginRight: '10px' }}
            />
            <span className="landing__logo-text">Suraksha<span className="text-gold">.pro</span></span>
          </div>
          <div className="landing__nav-actions">
            <LanguageSwitcher compact />
            {isAuthenticated ? (
              <button className="btn btn-gold btn-sm" onClick={() => navigate(getDashboardRoute())}>
                {t('landingGoToDashboard')}
              </button>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => navigate('/auth')}>{t('landingLogin')}</button>
                <button className="btn btn-gold btn-sm" onClick={() => navigate('/auth')}>{t('landingGetStarted')}</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <Hero
        headline={{
          line1: t('landingHeroLine1'),
          line2: t('landingHeroLine2')
        }}
        subtitle={t('landingHeroSub')}
        buttons={{
          primary: {
            text: t('landingGetStarted'),
            onClick: () => navigate('/auth?mode=signup')
          },
          secondary: {
            text: t('landingExplore'),
            onClick: () => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
            }
          }
        }}
      />

      {/* Features */}
      <section className="landing__section" id="features">
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 className="landing__section-title heading-display" style={{ marginBottom: '1rem' }}>{t('landingKeyFeatures')}</h2>
          <p className="text-secondary" style={{ marginBottom: '1rem', fontSize: '1.125rem', textAlign: 'center' }}>{t('landingSwipe')}</p>
          <ShuffleFeatureCards 
            features={[
              { 
                id: 1, 
                icon: <MapIcon size={48} strokeWidth={1.5} color="#facc15" />, 
                title: t('landingFeature1Title'), 
                description: t('landingFeature1Desc') 
              },
              { 
                id: 2, 
                icon: <Brain size={48} strokeWidth={1.5} color="#facc15" />, 
                title: t('landingFeature2Title'), 
                description: t('landingFeature2Desc') 
              },
              { 
                id: 3, 
                icon: <Radio size={48} strokeWidth={1.5} color="#facc15" />, 
                title: t('landingFeature3Title'), 
                description: t('landingFeature3Desc') 
              },
              { 
                id: 4, 
                icon: <Bell size={48} strokeWidth={1.5} color="#facc15" />, 
                title: t('landingFeature4Title'), 
                description: t('landingFeature4Desc') 
              },
              { 
                id: 5, 
                icon: <Smartphone size={48} strokeWidth={1.5} color="#facc15" />, 
                title: t('landingFeature5Title'), 
                description: t('landingFeature5Desc') 
              },
              { 
                id: 6, 
                icon: <BarChart3 size={48} strokeWidth={1.5} color="#facc15" />, 
                title: t('landingFeature6Title'), 
                description: t('landingFeature6Desc') 
              },
            ]}
          />
        </div>
      </section>

      {/* About Us */}
      <section className="landing__section landing__section--dark" id="about">
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <h2 className="landing__section-title heading-display" style={{ marginBottom: '1rem' }}>{t('aboutTitle')}</h2>
          <p className="text-secondary" style={{ maxWidth: '700px', margin: '0 auto 2rem', fontSize: '1.125rem', lineHeight: '1.6' }}>
            {t('aboutDescription')}
          </p>
          
          <div className="landing__team-card">
            <h3 className="text-gold" style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>
              {t('teamName')}
            </h3>
            <div className="landing__team-grid">
              <div className="landing__team-member">
                <div className="landing__team-avatar">AB</div>
                <div className="landing__team-name">Avaneesh Bhirdi</div>
                <div className="landing__team-role text-gold">{t('leaderLabel')}</div>
              </div>
              <div className="landing__team-member">
                <div className="landing__team-avatar">SL</div>
                <div className="landing__team-name">Shreya Lukk</div>
                <div className="landing__team-role text-muted">{t('memberLabel')}</div>
              </div>
              <div className="landing__team-member">
                <div className="landing__team-avatar">MP</div>
                <div className="landing__team-name">Manthan Patel</div>
                <div className="landing__team-role text-muted">{t('memberLabel')}</div>
              </div>
              <div className="landing__team-member">
                <div className="landing__team-avatar">SW</div>
                <div className="landing__team-name">Suhani Wali</div>
                <div className="landing__team-role text-muted">{t('memberLabel')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

    {/* landing footer */}
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
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth')}>{t('landingLogin')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth?mode=signup')}>{t('authSignup')}</button>
          </div>
        </div>
      </div>
    </footer>
    </div>
  )
}
