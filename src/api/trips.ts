import { Trip } from '../types/trip';

// In production the PHP API sits next to the built site at /api.
// Override with VITE_API_BASE for other setups.
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTrips(): Promise<Trip[]> {
  return handle<Trip[]>(await fetch(`${API_BASE}/trips.php`));
}

export async function fetchTrip(slug: string): Promise<Trip> {
  return handle<Trip>(await fetch(`${API_BASE}/trips.php?slug=${encodeURIComponent(slug)}`));
}

export async function login(password: string): Promise<void> {
  await handle(await fetch(`${API_BASE}/auth.php?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  }));
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth.php?action=logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=check`, { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.authenticated);
  } catch {
    return false;
  }
}

export async function createTrip(form: FormData): Promise<Trip> {
  return handle<Trip>(await fetch(`${API_BASE}/admin.php?action=create`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  }));
}

export async function updateTrip(id: number, form: FormData): Promise<Trip> {
  return handle<Trip>(await fetch(`${API_BASE}/admin.php?action=update&id=${id}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  }));
}

export async function deleteTrip(id: number): Promise<void> {
  await handle(await fetch(`${API_BASE}/admin.php?action=delete&id=${id}`, {
    method: 'POST',
    credentials: 'include',
  }));
}
