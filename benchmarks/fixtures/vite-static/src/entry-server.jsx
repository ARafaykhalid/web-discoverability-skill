import { renderToStaticMarkup } from 'react-dom/server';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Changelog from './pages/Changelog.jsx';

/**
 * The build-time renderer.
 *
 * `renderToStaticMarkup` rather than `renderToString`: nothing hydrates, so the
 * data-reactroot attributes and comment markers a hydratable render emits would
 * be bytes with no consumer.
 */
const COMPONENTS = {
  home: Home,
  about: About,
  changelog: Changelog,
};

export const PAGES = Object.keys(COMPONENTS);

export function renderPage(name) {
  const Component = COMPONENTS[name];
  if (!Component) throw new Error(`no page component registered for "${name}"`);
  return renderToStaticMarkup(<Component />);
}
