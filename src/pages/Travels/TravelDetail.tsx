import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Trip, formatMonthYear } from '../../types/trip';
import { fetchTrip } from '../../api/trips';
import SynthwaveBackground from '../../components/SynthwaveBackground/SynthwaveBackground';
import './Travels.scss';

function TravelDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setStatus('loading');
    fetchTrip(slug)
      .then((data) => {
        setTrip(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <SynthwaveBackground />
      <div className="travels">
        <div className="travels__topbar">
          <Link to="/travels" className="travels__back">&lt; all travels</Link>
        </div>

        {status === 'loading' && <div className="travels__state">loading...</div>}
        {status === 'error' && (
          <div className="travels__state travels__state--error">trip not found.</div>
        )}

        {status === 'ready' && trip && (
          <div className="travels__detail">
            <h1 className="travels__title">{trip.title}</h1>
            <div className="travels__detail-meta">
              <span className="loc">{trip.location}</span>
              <span>{formatMonthYear(trip.month, trip.year)}</span>
            </div>

            <div className="travels__blocks">
              {trip.blocks.map((block, i) =>
                block.type === 'text' ? (
                  <p key={i} className="travels__text">{block.text}</p>
                ) : (
                  <figure key={i} className="travels__image">
                    <img
                      src={block.url}
                      alt={trip.title}
                      loading="lazy"
                      onClick={() => block.url && setLightbox(block.url)}
                    />
                  </figure>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <div className="travels__lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
        </div>
      )}
    </>
  );
}

export default TravelDetail;
