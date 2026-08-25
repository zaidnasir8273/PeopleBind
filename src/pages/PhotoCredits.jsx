import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'
import bransonPhoto from '../assets/authors/richard-branson.webp'
import sinekPhoto from '../assets/authors/simon-sinek.webp'
import collinsPhoto from '../assets/authors/jim-collins.webp'
import jobsPhoto from '../assets/authors/steve-jobs.webp'
import fordPhoto from '../assets/authors/henry-ford.webp'
import sandbergPhoto from '../assets/authors/sheryl-sandberg.webp'
import gatesPhoto from '../assets/authors/bill-gates.webp'
import angelouPhoto from '../assets/authors/maya-angelou.webp'
import maxwellPhoto from '../assets/authors/john-maxwell.webp'
import lombardiPhoto from '../assets/authors/vince-lombardi.webp'
import kelleherPhoto from '../assets/authors/herb-kelleher.webp'
import blanchardPhoto from '../assets/authors/ken-blanchard.webp'

const CC_BY_3 = { name: 'CC BY 3.0', url: 'https://creativecommons.org/licenses/by/3.0/' }
const CC_BY_SA_3 = { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0/' }
const CC_BY_SA_2 = { name: 'CC BY-SA 2.0', url: 'https://creativecommons.org/licenses/by-sa/2.0/' }
const CC_BY_4 = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }
const CC_BY_2 = { name: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0/' }
const CC_BY_SA_4 = { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' }
const PD = { name: 'Public domain', url: null }

const CREDITS = [
  {
    name: 'Richard Branson',
    photo: bransonPhoto,
    credit: 'David Shankbone',
    license: CC_BY_3,
    source: 'https://commons.wikimedia.org/wiki/File:5.3.10RichardBransonByDavidShankbone.jpg',
  },
  {
    name: 'Simon Sinek',
    photo: sinekPhoto,
    credit: 'U.S. Marine Corps (public domain work)',
    license: PD,
    source: 'https://commons.wikimedia.org/wiki/File:Simon_Sinek_speaks_to_I_MIG_Marines_(2)_(cropped).jpg',
  },
  {
    name: 'Jim Collins',
    photo: collinsPhoto,
    credit: 'Mangoed',
    license: CC_BY_3,
    source: 'https://commons.wikimedia.org/wiki/File:Jim_Collins.jpg',
  },
  {
    name: 'Steve Jobs',
    photo: jobsPhoto,
    credit: 'MetalGearLiquid, based on work by Matt Yohe',
    license: CC_BY_SA_3,
    source: 'https://commons.wikimedia.org/wiki/File:Steve_Jobs_Headshot_2010-CROP2.jpg',
  },
  {
    name: 'Henry Ford',
    photo: fordPhoto,
    credit: 'Unknown (1919, public domain)',
    license: PD,
    source: 'https://commons.wikimedia.org/wiki/File:Henry_ford_1919.jpg',
  },
  {
    name: 'Sheryl Sandberg',
    photo: sandbergPhoto,
    credit: 'World Economic Forum',
    license: CC_BY_SA_2,
    source: 'https://commons.wikimedia.org/wiki/File:Sheryl_Sandberg_WEF_2013_(crop_by_James_Tamim).jpg',
  },
  {
    name: 'Bill Gates',
    photo: gatesPhoto,
    credit: 'Bogdan Hoyaux / European Union',
    license: CC_BY_4,
    source: 'https://commons.wikimedia.org/wiki/File:Bill_Gates_at_the_European_Commission_-_2025_-_P067383-987995_(cropped).jpg',
  },
  {
    name: 'Maya Angelou',
    photo: angelouPhoto,
    credit: 'York College ISLGP',
    license: CC_BY_2,
    source: 'https://commons.wikimedia.org/wiki/File:Maya_Angelou_visits_YCP_Feb_2013_(cropped).jpg',
  },
  {
    name: 'John C. Maxwell',
    photo: maxwellPhoto,
    credit: 'Ministerio de Cultura y Deportes Guatemala',
    license: CC_BY_2,
    source: 'https://commons.wikimedia.org/wiki/File:John_C._Maxwell_(cropped).jpg',
  },
  {
    name: 'Vince Lombardi',
    photo: lombardiPhoto,
    credit: 'Unknown (1964, public domain)',
    license: PD,
    source: 'https://commons.wikimedia.org/wiki/File:Vince_Lombardi_(1913-1970)_in_1964_Crop.jpg',
  },
  {
    name: 'Herb Kelleher',
    photo: kelleherPhoto,
    credit: 'SouthwestArchive',
    license: CC_BY_SA_4,
    source: 'https://commons.wikimedia.org/wiki/File:Herb_Kelleher_(131125herb).jpg',
  },
  {
    name: 'Ken Blanchard',
    photo: blanchardPhoto,
    credit: 'EditorMCL',
    license: CC_BY_SA_4,
    source: 'https://commons.wikimedia.org/wiki/File:Ken_headshot_2013.jpg',
  },
]

export default function PhotoCredits() {
  return (
    <div className="page">
      <SiteHeader />

      <section className="credits-section">
        <p className="section-eyebrow">ATTRIBUTION</p>
        <h1 className="section-title">Photo credits</h1>
        <p className="credits-lede">
          The author photos on our sign-in and sign-up pages come from Wikimedia
          Commons under free licenses. Each has been resized and cropped to a
          circle from the original. Photos are credited below as their licenses
          require; a few authors quoted elsewhere on this site don't have a
          reliably-licensed photo available and appear with initials instead.
        </p>

        <ul className="credits-list">
          {CREDITS.map((c) => (
            <li key={c.name} className="credits-item">
              <img src={c.photo} alt={c.name} className="credits-photo" />
              <div>
                <p className="credits-name">{c.name}</p>
                <p className="credits-meta">
                  Photo: {c.credit} ·{' '}
                  {c.license.url ? (
                    <a href={c.license.url} target="_blank" rel="noopener noreferrer">{c.license.name}</a>
                  ) : (
                    c.license.name
                  )}
                  {' · '}
                  <a href={c.source} target="_blank" rel="noopener noreferrer">source</a>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <SiteFooter />
    </div>
  )
}
