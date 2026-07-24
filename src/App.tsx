import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.scss';
import Home from './pages/Home';
import { initGA, pageview } from './utils/analytics';

// Home is the landing page, so it stays in the main bundle. Everything else is
// split out: the admin CMS in particular was being shipped to every visitor.
const TravelsList = lazy(() => import('./pages/Travels/TravelsList'));
const TravelDetail = lazy(() => import('./pages/Travels/TravelDetail'));
const Admin = lazy(() => import('./pages/Admin/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    pageview(location.pathname);
  }, [location.pathname]);

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/travels" element={<TravelsList />} />
        <Route path="/travels/:slug" element={<TravelDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
