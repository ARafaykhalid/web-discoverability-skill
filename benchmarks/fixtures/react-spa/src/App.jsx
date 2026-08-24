import { Routes, Route } from 'react-router-dom';
import SiteChrome from './components/SiteChrome.jsx';
import Home from './routes/Home.jsx';
import Features from './routes/Features.jsx';

/**
 * Marketing routes.
 *
 * Both routes live behind the same shell, so the initial response for `/` and
 * `/features` is byte-for-byte identical. That is why snapshot.json points both
 * pages at the same raw capture file.
 */
export default function App() {
  return (
    <SiteChrome>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
      </Routes>
    </SiteChrome>
  );
}
