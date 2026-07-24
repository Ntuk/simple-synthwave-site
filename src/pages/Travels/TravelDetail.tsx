import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Trip, formatMonthYear } from '../../types/trip';
import { fetchTrip } from '../../api/trips';
import SynthwaveBackground from '../../components/SynthwaveBackground/SynthwaveBackground';
import './Travels.scss';

function TravelDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Track the photo by index so the lightbox can step through them.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const photos = trip?.blocks.filter(b => b.type === 'image' && b.url) ?? [];
  const lightbox = lightboxIndex === null ? null : photos[lightboxIndex]?.url ?? null;

  const openLightbox = (url: string, el: HTMLElement) => {
    openerRef.current = el;
    setLightboxIndex(photos.findIndex(p => p.url === url));
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    // Put the caret back where it came from instead of dumping it at the top.
    openerRef.current?.focus();
  };

  const step = (dir: number) => {
    setLightboxIndex(i => (i === null ? i : (i + dir + photos.length) % photos.length));
  };

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

  // Per-trip title and description. This helps browser tabs, bookmarks and
  // Google (which renders JS). Facebook and LinkedIn do not run JS, so their
  // cards still use the site-wide tags in index.html.
  useEffect(() => {
    if (!trip) return;
    const prevTitle = document.title;
    document.title = `${trip.title} — Travels — Nico Tukiainen`;

    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute('content') ?? '';
    meta?.setAttribute(
      'content',
      `${trip.title}. ${trip.location}, ${formatMonthYear(trip.month, trip.year)}.`
    );

    return () => {
      document.title = prevTitle;
      meta?.setAttribute('content', prevDesc);
    };
  }, [trip]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, photos.length]);

  // Move focus into the dialog so Escape and the arrows reach it, and stop the
  // page behind from scrolling while it is open.
  useEffect(() => {
    if (lightboxIndex === null) return;
    closeBtnRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [lightboxIndex]);

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
                    <button
                      type="button"
                      className="travels__image-btn"
                      onClick={(e) => block.url && openLightbox(block.url, e.currentTarget)}
                      aria-label={`Open photo ${photos.findIndex(p => p.url === block.url) + 1} of ${photos.length} from ${trip.title}`}
                    >
                      <img src={block.url} alt="" loading="lazy" />
                    </button>
                  </figure>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="travels__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${(lightboxIndex ?? 0) + 1} of ${photos.length}`}
          onClick={closeLightbox}
        >
          <button
            ref={closeBtnRef}
            type="button"
            className="travels__lightbox-close"
            onClick={closeLightbox}
            aria-label="Close photo"
          >
            ×
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="travels__lightbox-nav travels__lightbox-nav--prev"
                onClick={(e) => { e.stopPropagation(); step(-1); }}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                className="travels__lightbox-nav travels__lightbox-nav--next"
                onClick={(e) => { e.stopPropagation(); step(1); }}
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          )}

          <img src={lightbox} alt={`${trip?.title ?? 'Trip'} photo`} onClick={(e) => e.stopPropagation()} />

          {photos.length > 1 && (
            <div className="travels__lightbox-count">
              {(lightboxIndex ?? 0) + 1} / {photos.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default TravelDetail;
