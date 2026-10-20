// Client for the signed-in user's saved Color Wheel presets. A preset is
// breed-independent: up to three habitats of "Base_Color_ID:Sec_Color_ID"
// codes. Every call returns the user's full list, sorted by name.
import { API_BASE } from './base';

export const MAX_PRESET_NAME = 32;

export interface SavedWheelPreset {
  id: string;
  name: string;
  habitats: string[][];
  updatedAt: string;
}

async function req(idToken: string, path: string, init?: RequestInit): Promise<SavedWheelPreset[]> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let detail = `Preset request failed (${res.status})`;
    try { const b = await res.json(); if (b?.error) detail = b.error; } catch { /* keep default */ }
    throw new Error(detail);
  }
  return res.json();
}

export const fetchWheelPresets = (idToken: string) =>
  req(idToken, '/api/me/wheel-presets');

export const createWheelPreset = (idToken: string, name: string, habitats: string[][]) =>
  req(idToken, '/api/me/wheel-presets', { method: 'POST', body: JSON.stringify({ name, habitats }) });

export const overwriteWheelPreset = (idToken: string, id: string, habitats: string[][]) =>
  req(idToken, `/api/me/wheel-presets/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ habitats }) });

export const deleteWheelPreset = (idToken: string, id: string) =>
  req(idToken, `/api/me/wheel-presets/${encodeURIComponent(id)}`, { method: 'DELETE' });
