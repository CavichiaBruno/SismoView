import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StartupLoader } from './components/StartupLoader'
import { EarthquakeDashboard } from './components/EarthquakeDashboard'
import { ParallaxComponent } from './components/ui/parallax-scrolling'
import { earthquakes } from './data/earthquakes'
import { translate } from './i18n'
import './App.css'

const CesiumMap = lazy(async () => {
  const [mapModule] = await Promise.all([
    import('./components/CesiumMap'),
    new Promise((resolve) => window.setTimeout(resolve, 1500)),
  ])
  return { default: mapModule.CesiumMap }
})

function App() {
  useTranslation()
  const [showStartupLoader, setShowStartupLoader] = useState(true)
  const [startupComplete, setStartupComplete] = useState(false)
  const [startupLoaderExited, setStartupLoaderExited] = useState(false)
  const [introSoundEnabled, setIntroSoundEnabled] = useState(false)
  const [screen, setScreen] = useState<'welcome' | 'tour' | 'dashboard'>('welcome')

  const openDashboard = () => {
    const confirmed = window.confirm(
      translate('¿Seguro que quieres ir directamente al dashboard y saltarte la experiencia interactiva?'),
    )
    if (confirmed) setScreen('dashboard')
  }

  return (
    <>
      <div className={`app-shell${startupComplete ? ' app-shell--ready' : ''}`}>
        <main>
          {screen === 'welcome' && (
            <ParallaxComponent
              startTitleAnimation={startupLoaderExited}
              introSoundEnabled={introSoundEnabled}
              onStart={() => setScreen('tour')}
              onOpenDashboard={openDashboard}
            />
          )}
          {screen === 'tour' && (
            <Suspense
              fallback={
                <div className="map-provisioning-loader" role="status" aria-live="polite">
                  <span className="map-provisioning-loader__spinner" aria-hidden="true" />
                  <span>{translate('Preparando experiencia interactiva')}</span>
                </div>
              }
            >
              <CesiumMap
                events={earthquakes}
                startupComplete={startupLoaderExited}
                introSoundEnabled={introSoundEnabled}
                initialStep="typing"
              />
            </Suspense>
          )}
          {screen === 'dashboard' && <EarthquakeDashboard events={earthquakes} />}
        </main>
      </div>
      <StartupLoader
        visible={showStartupLoader}
        leaving={startupComplete}
        onComplete={() => setStartupComplete(true)}
        onSoundPreferenceChange={setIntroSoundEnabled}
        onExitComplete={() => {
          setShowStartupLoader(false)
          setStartupLoaderExited(true)
        }}
      />
    </>
  )
}

export default App
