import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.scss';
import Home from './pages/Home';
import TravelsList from './pages/Travels/TravelsList';
import TravelDetail from './pages/Travels/TravelDetail';
import Admin from './pages/Admin/Admin';
import NotFound from './pages/NotFound';
import { initGA, pageview } from './utils/analytics';

function App() {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    pageview(location.pathname);
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/travels" element={<TravelsList />} />
      <Route path="/travels/:slug" element={<TravelDetail />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
