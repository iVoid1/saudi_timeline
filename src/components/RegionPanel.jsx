import { REGIONS } from '../data/regions.js'
import { COUNTRY, getRegionContent } from '../data/regionsContent.js'

export default function RegionPanel({ region, governorate, onSelect, onGovernorateClear }) {
  const place = region ?? COUNTRY
  const tagline = getRegionContent(region?.id).tagline

  return <aside className="panel">
    <div className="panel__current" aria-live="polite" aria-atomic="true">
      <span className="panel__swatch" style={{ background: place.color }} aria-hidden="true" />
      {governorate && <span className="panel__en">{place.name}</span>}
      <h3 className="panel__name">{governorate?.name ?? place.name}</h3>
      {!governorate && <span className="panel__en">{place.nameEn}</span>}
      <p className="panel__text">{governorate
        ? `${governorate.name} ضمن ${place.name}. استكشف حكايتها في الخط الزمني.`
        : tagline}</p>
      <a className="btn btn--green" href="#story">
        {governorate ? 'اقرأ حكاية المحافظة' : region ? 'اقرأ حكاية المنطقة' : 'اقرأ حكاية المملكة'}
      </a>
      {governorate && <button type="button" className="panel__back" onClick={onGovernorateClear}>
        العودة إلى {place.name}
      </button>}
    </div>
    <ul className="chips" aria-label="مناطق المملكة">
      <li><button type="button" className={`chip${!region ? ' is-active' : ''}`}
        aria-pressed={!region} onClick={() => onSelect(null)}>
        <span className="chip__dot" style={{ background: COUNTRY.color }} aria-hidden="true" />
        المملكة كلها
      </button></li>
      {REGIONS.map((item) => <li key={item.id}>
        <button type="button" className={`chip${region?.id === item.id ? ' is-active' : ''}`}
          aria-pressed={region?.id === item.id} onClick={() => onSelect(item.id)}>
          <span className="chip__dot" style={{ background: item.color }} aria-hidden="true" />
          {item.name}
        </button>
      </li>)}
    </ul>
  </aside>
}
