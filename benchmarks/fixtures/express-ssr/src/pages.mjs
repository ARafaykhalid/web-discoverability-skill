/**
 * Per-route content.
 *
 * Each entry is the material one route needs and nothing else; `server.mjs` decides
 * the canonical URL and hands the whole thing to the layout. `extraHead` exists for
 * routes that need a head element the layout does not emit, and it is appended to
 * the layout head verbatim - nothing here compares the two.
 */
import { ORIGIN } from './render.mjs';

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${ORIGIN}/#organization`,
  name: 'Ridgeline Roofing',
  url: ORIGIN,
  logo: `${ORIGIN}/img/ridgeline-mark.png`,
  telephone: '+44 1947 600000',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '14 Harbour Road',
    addressLocality: 'Whitby',
    postalCode: 'YO21 3PU',
    addressCountry: 'GB',
  },
};

export const home = {
  title: 'Ridgeline Roofing: slate and tile work on the North Yorkshire coast',
  description:
    'A four-person roofing firm working on pitched slate and clay tile roofs between Whitby and Scarborough. What we do, what it costs, and how to reach us.',
  image: '/img/og-home.png',
  imageAlt: 'Two roofers re-laying slate on a terraced house',
  jsonLd: organization,
  body: `  <main>
    <h1>Slate and tile roofing on the North Yorkshire coast</h1>
    <p>
      We are a four-person firm working on pitched roofs between Whitby and Scarborough.
      Most of our work is re-laying slate on Victorian terraces and replacing clay pantiles
      that salt air has eroded past repair. We do not fit flat roofs and we do not subcontract.
    </p>
    <img src="/img/pantile-repair.jpg" alt="Weathered clay pantiles part-stripped to expose the battens beneath" width="960" height="640">
    <p>
      Every job starts with a roof survey we write up and hand over whether or not you use us.
      The <a href="/pricing">costs page</a> explains how we quote, and the
      <a href="/guides/roof-tile-selection">tile selection guide</a> covers the choices that
      matter most on an exposed roof.
    </p>
  </main>`,
};

export const pricing = {
  title: 'What roof work costs, and how we arrive at a figure',
  description:
    'How Ridgeline Roofing prices a job: day rate, material margin, scaffold hire, and the three things that move a quote most on a coastal roof.',
  image: '/img/og-pricing.png',
  imageAlt: 'A hand-written quote sheet on a clipboard beside a bundle of slate',
  jsonLd: organization,
  body: `  <main>
    <h1>What roof work costs</h1>
    <p>
      We quote per job, not per square metre, because access decides more of the cost than area
      does. A two-storey terrace with a shared scaffold run is cheaper per tile than a detached
      bungalow that needs a tower built and struck twice.
    </p>
    <img src="/img/scaffold-run.jpg" alt="Scaffold erected along the rear elevation of a terraced row" width="960" height="640">
    <p>
      Three things move a figure more than anything else: whether the battens have gone, whether
      the lead flashing can be re-dressed or has to be replaced, and how long the scaffold needs
      to stand. All three are in the written survey before you are asked to decide anything.
      If you want to talk it through, the <a href="/contact">contact page</a> has our number.
    </p>
  </main>`,
};

export const tileGuide = {
  title: 'Choosing roof tiles for a coastal roof | Ridgeline Roofing',
  description:
    'Clay, concrete and natural slate compared for a roof within two miles of the North Sea, with the fixing and pitch limits that rule some of them out.',
  image: '/img/og-tile-guide.png',
  imageAlt: 'Four tile samples laid side by side on a workbench',
  // The layout already emits a title from `title` above. This fragment was added
  // later for the author line and the title was copied in with it, so the response
  // carries both.
  extraHead: `  <meta name="author" content="Neil Ackroyd">
  <title>Choosing roof tiles for a coastal roof</title>`,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Choosing roof tiles for a coastal roof',
    url: `${ORIGIN}/guides/roof-tile-selection`,
    datePublished: '2026-01-14',
    author: { '@type': 'Person', name: 'Neil Ackroyd' },
    publisher: { '@id': `${ORIGIN}/#organization` },
  },
  body: `  <main>
    <h1>Choosing roof tiles for a coastal roof</h1>
    <p>
      Within two miles of the North Sea the deciding factor is not appearance but how the tile
      is held down. Salt air strips galvanising off nails within a decade, so anything we lay
      inside that band is fixed with copper or stainless, and that rules out some tiles whose
      published fixing schedules assume mild steel.
    </p>
    <img src="/img/tile-samples.jpg" alt="Clay pantile, concrete interlocking tile and two grades of natural slate side by side" width="1200" height="800">
    <p>
      Pitch matters next. Interlocking concrete tiles go down to 15 degrees; a plain clay tile
      wants 35 or more, and a roof already built at 22 cannot take one without a full re-pitch.
      We measure before recommending. Return to <a href="/">the overview</a> or read
      <a href="/pricing">how we price the work</a>.
    </p>
  </main>`,
};

export const contact = {
  title: 'Contact Ridgeline Roofing in Whitby',
  description:
    'Phone, email and yard address for Ridgeline Roofing, plus the hours someone is actually there to answer and how far we travel for a survey.',
  image: '/img/og-contact.png',
  imageAlt: 'The yard entrance on Harbour Road with the workshop behind',
  jsonLd: organization,
  body: `  <main>
    <h1>Contact us</h1>
    <p>
      Ring <a href="tel:+441947600000">01947 600000</a> between seven and half past four on a
      weekday, or email <a href="mailto:work@example.com">work@example.com</a> and one of us
      will reply the same evening. The yard is at 14 Harbour Road, Whitby YO21 3PU.
    </p>
    <img src="/img/yard-entrance.jpg" alt="The open gate of the Harbour Road yard with stacked slate inside" width="960" height="640">
    <p>
      We survey without charge anywhere within twenty-five miles. Beyond that we ask for the
      travel time. If you have already read <a href="/pricing">what the work costs</a> it will
      be a shorter conversation.
    </p>
  </main>`,
};

/**
 * Staff preview of the next revision of the costs page.
 *
 * Excluded from the index by the `X-Robots-Tag` the middleware in server.mjs adds
 * to every `/internal/` response. The meta element below was copied in from the
 * public template when this route was written and contradicts that header.
 */
export const internalPreview = {
  title: 'Staff preview: revised costs page',
  description: 'Unpublished draft of the costs page, kept here so the team can read it before it replaces the live copy.',
  image: '/img/og-home.png',
  imageAlt: 'Two roofers re-laying slate on a terraced house',
  extraHead: `  <meta name="robots" content="index, follow">`,
  body: `  <main>
    <h1>Staff preview: revised costs page</h1>
    <p>
      This is the draft wording for the costs page. It is not linked from anywhere public and it
      is not listed in the sitemap. Do not send this address to a customer; send them
      <a href="/pricing">the published page</a> instead.
    </p>
  </main>`,
};
