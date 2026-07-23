import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Trip, TripBlock, MONTHS, formatMonthYear } from '../../types/trip';
import {
  checkAuth, login, logout, fetchTrips, fetchTrip, createTrip, updateTrip, deleteTrip,
} from '../../api/trips';
import SynthwaveBackground from '../../components/SynthwaveBackground/SynthwaveBackground';
import './Admin.scss';

const CURRENT_YEAR = new Date().getFullYear();

type EditorBlock =
  | { key: string; type: 'text'; text: string }
  | { key: string; type: 'image'; filename: string; url: string } // existing image
  | { key: string; type: 'image'; file: File; previewUrl: string }; // new upload

let keyCounter = 0;
const nextKey = () => `b${keyCounter++}`;

function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);

  // form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);

  useEffect(() => {
    checkAuth().then(setAuthed);
  }, []);

  const loadTrips = () => {
    fetchTrips().then(setTrips).catch(() => setTrips([]));
  };

  useEffect(() => {
    if (authed) loadTrips();
  }, [authed]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await login(password);
      setPassword('');
      setAuthed(true);
    } catch {
      setMessage({ text: 'wrong password', ok: false });
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuthed(false);
  };

  const resetForm = () => {
    blocks.forEach((b) => {
      if (b.type === 'image' && 'previewUrl' in b) URL.revokeObjectURL(b.previewUrl);
    });
    setEditingId(null);
    setTitle('');
    setLocation('');
    setMonth(1);
    setYear(CURRENT_YEAR);
    setBlocks([]);
  };

  const startEdit = (trip: Trip) => {
    fetchTrip(trip.slug).then((full) => {
      setEditingId(full.id);
      setTitle(full.title);
      setLocation(full.location);
      setMonth(full.month);
      setYear(full.year);
      setBlocks(
        full.blocks.map((b: TripBlock) =>
          b.type === 'text'
            ? { key: nextKey(), type: 'text', text: b.text ?? '' }
            : { key: nextKey(), type: 'image', filename: b.filename ?? '', url: b.url ?? '' }
        )
      );
      setMessage(null);
      window.scrollTo(0, 0);
    });
  };

  const addTextBlock = () => {
    setBlocks((prev) => [...prev, { key: nextKey(), type: 'text', text: '' }]);
  };

  const addImageBlocks = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const added: EditorBlock[] = Array.from(files).map((file) => ({
      key: nextKey(),
      type: 'image',
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setBlocks((prev) => [...prev, ...added]);
    e.target.value = '';
  };

  const updateTextBlock = (key: string, text: string) => {
    setBlocks((prev) => prev.map((b) => (b.key === key && b.type === 'text' ? { ...b, text } : b)));
  };

  const removeBlock = (key: string) => {
    setBlocks((prev) => {
      const target = prev.find((b) => b.key === key);
      if (target && target.type === 'image' && 'previewUrl' in target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((b) => b.key !== key);
    });
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('location', location);
      form.append('month', String(month));
      form.append('year', String(year));

      const payload: object[] = [];
      let imageRef = 0;
      blocks.forEach((b) => {
        if (b.type === 'text') {
          if (b.text.trim() !== '') payload.push({ type: 'text', text: b.text });
        } else if ('filename' in b) {
          payload.push({ type: 'image', filename: b.filename });
        } else {
          form.append('images[]', b.file);
          payload.push({ type: 'image', imageRef: imageRef++ });
        }
      });
      form.append('blocks', JSON.stringify(payload));

      if (editingId !== null) {
        await updateTrip(editingId, form);
      } else {
        await createTrip(form);
      }
      resetForm();
      loadTrips();
      setMessage({ text: editingId !== null ? 'trip updated' : 'trip saved', ok: true });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'save failed', ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this trip and its images?')) return;
    try {
      await deleteTrip(id);
      if (editingId === id) resetForm();
      loadTrips();
    } catch {
      setMessage({ text: 'delete failed', ok: false });
    }
  };

  if (authed === null) {
    return (
      <>
        <SynthwaveBackground />
        <div className="admin"><div className="admin__title">...</div></div>
      </>
    );
  }

  if (!authed) {
    return (
      <>
        <SynthwaveBackground />
        <div className="admin">
          <div className="admin__topbar">
            <Link to="/" className="admin__back">&lt; back home</Link>
          </div>
          <h1 className="admin__title">Admin</h1>
          <form className="admin__panel" onSubmit={handleLogin}>
            <div className="admin__field">
              <label htmlFor="pw">Password</label>
              <input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <button className="admin__button" type="submit">Log in</button>
            {message && (
              <div className={`admin__message ${message.ok ? 'admin__message--ok' : 'admin__message--error'}`}>
                {message.text}
              </div>
            )}
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <SynthwaveBackground />
      <div className="admin">
        <div className="admin__topbar">
          <Link to="/travels" className="admin__back">&lt; view travels</Link>
          <button className="admin__delete" onClick={handleLogout}>Log out</button>
        </div>
        <h1 className="admin__title">{editingId !== null ? 'Edit Trip' : 'New Trip'}</h1>

        <form className="admin__panel" onSubmit={handleSubmit}>
          <div className="admin__field">
            <label htmlFor="title">Title</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="admin__field">
            <label htmlFor="location">Location</label>
            <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>

          <div className="admin__row">
            <div className="admin__field">
              <label htmlFor="month">Month</label>
              <select id="month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="admin__field">
              <label htmlFor="year">Year</label>
              <input
                id="year"
                type="number"
                min={1970}
                max={CURRENT_YEAR}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="admin__blocks-label">Story (text &amp; photos, in order)</div>

          <div className="admin__blocks">
            {blocks.length === 0 && (
              <div className="admin__blocks-empty">No content yet. Add a text or photo block below.</div>
            )}

            {blocks.map((block, i) => (
              <div key={block.key} className="admin__block">
                <div className="admin__block-controls">
                  <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0} title="Move up">↑</button>
                  <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} title="Move down">↓</button>
                  <button type="button" className="admin__block-remove" onClick={() => removeBlock(block.key)} title="Remove">✕</button>
                </div>

                {block.type === 'text' ? (
                  <textarea
                    className="admin__block-text"
                    placeholder="Write something..."
                    value={block.text}
                    onChange={(e) => updateTextBlock(block.key, e.target.value)}
                  />
                ) : (
                  <img
                    className="admin__block-image"
                    src={'previewUrl' in block ? block.previewUrl : block.url}
                    alt=""
                  />
                )}
              </div>
            ))}
          </div>

          <div className="admin__add-row">
            <button type="button" className="admin__secondary" onClick={addTextBlock}>+ Text</button>
            <label className="admin__secondary admin__add-photo">
              + Photos
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImageBlocks} hidden />
            </label>
          </div>

          <button className="admin__button" type="submit" disabled={submitting}>
            {submitting ? 'saving...' : editingId !== null ? 'Update trip' : 'Save trip'}
          </button>
          {editingId !== null && (
            <button type="button" className="admin__button admin__secondary" onClick={resetForm}>
              Cancel edit
            </button>
          )}

          {message && (
            <div className={`admin__message ${message.ok ? 'admin__message--ok' : 'admin__message--error'}`}>
              {message.text}
            </div>
          )}
        </form>

        {trips.length > 0 && (
          <div className="admin__trips">
            <div className="admin__trips-title">Existing trips</div>
            {trips.map((trip) => (
              <div key={trip.id} className="admin__trip-row">
                <span>
                  {trip.title} <span className="meta">— {trip.location}, {formatMonthYear(trip.month, trip.year)}</span>
                </span>
                <div className="admin__trip-actions">
                  <button className="admin__edit" onClick={() => startEdit(trip)}>edit</button>
                  <button className="admin__delete" onClick={() => handleDelete(trip.id)}>delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default Admin;
