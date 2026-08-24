import { Routes, Route } from 'react-router-dom';
import SiteChrome from './components/SiteChrome.jsx';
import HandbookArticle from './routes/HandbookArticle.jsx';

/**
 * Documentation routes.
 *
 * One dynamic route. The article body is fetched at runtime, so even a consumer
 * that executes scripts has to wait for a second round trip before the page says
 * anything, and a consumer that does not execute scripts never sees it.
 */
export default function HandbookApp() {
  return (
    <SiteChrome>
      <Routes>
        <Route path="/handbook/:slug" element={<HandbookArticle />} />
      </Routes>
    </SiteChrome>
  );
}
