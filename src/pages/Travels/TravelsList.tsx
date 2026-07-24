import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trip, formatMonthYear } from '../../types/trip';
import { fetchTrips } from '../../api/trips';
import SynthwaveBackground from '../../components/SynthwaveBackground/SynthwaveBackground';
import './Travels.scss';

function TravelsList() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    fetchTrips()
      .then((data) => {
        setTrips(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <>
      <SynthwaveBackground />
      <div className="travels">
        <div className="travels__topbar">
          <Link to="/" className="travels__back">&lt; back home</Link>
        </div>

        <h1 className="travels__title">Travels</h1>
        <p className="travels__subtitle">places I've wandered</p>

        {status === 'loading' && (
          // Skeleton cards in the real grid, so the layout doesn't jump when
          // the trips land.
          <div className="travels__grid" aria-busy="true" aria-label="Loading trips">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="travels__card travels__card--skeleton">
                <div className="travels__card-media" />
                <div className="travels__card-body">
                  <div className="skeleton-line skeleton-line--title" />
                  <div className="skeleton-line skeleton-line--meta" />
                </div>
              </div>
            ))}
          </div>
        )}
        {status === 'error' && (
          <div className="travels__state travels__state--error">
            could not load trips. try again later.
          </div>
        )}
        {status === 'ready' && trips.length === 0 && (
          <div className="travels__state">no trips logged yet. check back soon.</div>
        )}

        {status === 'ready' && trips.length > 0 && (
          <div className="travels__grid">
            {trips.map((trip) => (
              <Link key={trip.id} to={`/travels/${trip.slug}`} className="travels__card">
                <div className="travels__card-media">
                  {trip.cover ? (
                    <img src={trip.cover} alt={trip.title} loading="lazy" />
                  ) : (
                    <div className="travels__card-placeholder">✦</div>
                  )}
                </div>
                <div className="travels__card-body">
                  <h2 className="travels__card-title">{trip.title}</h2>
                  <div className="travels__card-meta">
                    <span className="travels__card-location">{trip.location}</span>
                    <span>{formatMonthYear(trip.month, trip.year)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default TravelsList;
