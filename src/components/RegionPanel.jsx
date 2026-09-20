import { REGIONS } from '../data/regions.js'
import { getRegionContent } from '../data/regionsContent.js'

export default function RegionPanel({ region, onSelect }) {
  const tagline = region ? getRegionContent(region.id).tagline : ''

  return (
    <aside className="panel">
      <div className="panel__current" aria-live="polite">
        {region ? (
          <>
            <span className="panel__swatch" style={{ background: region.color }} aria-hidden="true" />
            <h3 className="panel__name">{region.name}</h3>
            <span className="panel__en">{region.nameEn}</span>
            {tagline && <p className="panel__text">{tagline}</p>}
            <a className="btn btn--green" href="#story">اقرأ حكاية المنطقة</a>
          </>
        ) : (
          <>
            <h3 className="panel__name">اختر منطقة</h3>
            <p className="panel__text">اضغط على الخريطة أو على اسم من القائمة، وتفتح حكايتها تحت الخريطة.</p>
          </>
        )}
      </div>

      <ul className="chips" aria-label="مناطق المملكة">
        {REGIONS.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className={`chip${region?.id === r.id ? ' is-active' : ''}`}
              aria-pressed={region?.id === r.id}
              onClick={() => onSelect(r.id)}
            >
              <span className="chip__dot" style={{ background: r.color }} />
              {r.name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
