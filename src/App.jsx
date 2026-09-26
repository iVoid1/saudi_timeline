import { useState } from 'react'

import SaudiMap from './components/SaudiMap.jsx'
import RegionPanel from './components/RegionPanel.jsx'
import PlaceStory from './components/PlaceStory.jsx'
import OllamaChat from './components/OllamaChat.jsx'

import { REGIONS } from './data/regions.js'
import { COUNTRY, SITE } from './data/regionsContent.js'
import { AI } from './config/ai.js'

export default function App() {
  const [selectedId, setSelectedId] = useState(null)

  const [
    selectedGovernorate,
    setSelectedGovernorate,
  ] = useState(null)

  const [chatOpen, setChatOpen] = useState(false)

  const region =
    REGIONS.find(
      (r) => r.id === selectedId
    ) ?? null

  function selectRegion(id) {
    setSelectedId(id)

    // عند تغيير المنطقة نلغي المحافظة القديمة
    setSelectedGovernorate(null)
  }

  function clearRegion() {
    setSelectedId(null)
    setSelectedGovernorate(null)
  }

  function selectGovernorate(governorate) {
    if (!governorate || governorate.regionId === selectedId) {
      setSelectedGovernorate(governorate)
    }
  }

  function goBack() {
    if (selectedGovernorate) setSelectedGovernorate(null)
    else clearRegion()
  }

  return (
    <div
      className="site"
      dir="rtl"
      lang="ar"
    >
      <nav
        className="topbar"
        aria-label="التنقل الرئيسي"
      >
        <div className="container topbar__inner">
          <a
            className="brand"
            href="#top"
          >
            {SITE.title}
          </a>

          <div className="topbar__links">
            <a href="#map">
              الخريطة
            </a>

            <a href="#story">
              {selectedGovernorate?.name ?? region?.name ?? 'المملكة كلها'}
            </a>

            {AI.enabled && (
              <button
                type="button"
                className="topbar__ask"
                onClick={() =>
                  setChatOpen(true)
                }
              >
                {AI.title}
              </button>
            )}
          </div>
        </div>
      </nav>

      <header
        className="hero"
        id="top"
      >
        <div className="container hero__inner">
          <div className="hero__copy">
            <p className="hero__eyebrow">
              {SITE.eyebrow}{' '}
              {SITE.number}
            </p>

            <h1 className="hero__title">
              {SITE.title}
            </h1>

            <p className="hero__subtitle">
              {SITE.subtitle}
            </p>

            <div className="hero__actions">
              <a
                className="btn"
                href="#map"
              >
                ابدأ الرحلة
              </a>

              <span className="hero__note">
                {REGIONS.length} منطقة، ذاكرة واحدة
              </span>
            </div>
          </div>

          <div className="hero__date">
            <strong aria-hidden="true">
              {SITE.number}
            </strong>

            <span>
              {SITE.day}
            </span>
          </div>
        </div>
      </header>

      <main className="container">
        <section
          className="explorer"
          id="map"
        >
          <div className="explorer__head">
            <h2>اختر وجهتك</h2>
            <p>{SITE.mapHint}</p>
          </div>

          <div className="explorer__grid">
            <SaudiMap
              selectedId={selectedId}
              onSelect={selectRegion}

              selectedGovernorate={
                selectedGovernorate
              }

              onGovernorateSelect={
                selectGovernorate
              }

              onBackToCountry={
                clearRegion
              }
            />

            <RegionPanel
              region={region}

              governorate={
                selectedGovernorate
              }

              onSelect={
                selectRegion
              }

              onGovernorateClear={() =>
                setSelectedGovernorate(null)
              }
            />
          </div>
        </section>

        <section
          className="story-section"
          id="story"
        >
          <PlaceStory
            key={selectedGovernorate?.id ?? region?.id ?? COUNTRY.id}
            regionId={region?.id ?? null}
            onBack={goBack}
            governorate={
              selectedGovernorate
            }
          />
        </section>
      </main>

      <footer className="footer container">
        <span>{SITE.title}</span>

        <span>
          {SITE.eyebrow}{' '}
          {SITE.number}
        </span>
      </footer>

      {AI.enabled && (
        <OllamaChat
          open={chatOpen}
          onOpenChange={setChatOpen}
          region={region}
        />
      )}
    </div>
  )
}
