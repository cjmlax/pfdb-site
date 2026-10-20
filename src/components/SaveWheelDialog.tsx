import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useLocation } from 'react-router';
import {
  MAX_PRESET_NAME, createWheelPreset, deleteWheelPreset, overwriteWheelPreset, type SavedWheelPreset,
} from '../api/wheelPresets';

// Saves the habitats as one of the user's presets: a new one under a name they
// choose, or over one they saved before. Signed out, it offers sign-in instead,
// coming back to this page (the layout is in the URL, so it survives).
export default function SaveWheelDialog({
  habitats, saved, onSaved, onClose,
}: {
  habitats: string[][];          // "Base_Color_ID:Sec_Color_ID" codes per habitat
  saved:    SavedWheelPreset[];
  onSaved:  (presets: SavedWheelPreset[]) => void;
  onClose:  () => void;
}) {
  const auth = useAuth();
  const location = useLocation();
  const idToken = auth.user?.id_token;
  const [target, setTarget] = useState<'new' | string>('new'); // 'new' or a saved preset's id
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // A preset deleted from under the selection falls back to a new one.
  const overwriting = target !== 'new' && saved.some(p => p.id === target) ? target : null;
  const trimmed = name.trim();
  const canSave = !busy && (overwriting ? true : trimmed.length > 0);

  const close = () => { if (!busy) onClose(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function run(action: () => Promise<SavedWheelPreset[]>, then?: () => void) {
    setBusy(true);
    setError(null);
    try {
      onSaved(await action());
      then?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!idToken || !canSave) return;
    void run(
      () => (overwriting ? overwriteWheelPreset(idToken, overwriting, habitats) : createWheelPreset(idToken, trimmed, habitats)),
      onClose,
    );
  }

  function remove(id: string) {
    if (!idToken) return;
    setConfirmDelete(null);
    void run(() => deleteWheelPreset(idToken, id));
  }

  return (
    <div className="lightbox-overlay" onClick={close}>
      <div
        className="crop-modal verify-modal color-save-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-wheel-title"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="save-wheel-title">Save this wheel</h2>
        {!auth.isAuthenticated || !idToken ? (
          <>
            <p className="search-hint">Sign in to save your own presets. You'll come back to this wheel afterwards.</p>
            <div className="crop-footer">
              <span />
              <div className="crop-buttons">
                <button type="button" className="csv-btn"
                  onClick={() => void auth.signinRedirect({ state: { returnTo: location.pathname + location.search } })}>
                  Sign in
                </button>
                <button type="button" className="csv-btn" onClick={close}>Cancel</button>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={e => { e.preventDefault(); save(); }}>
            <p className="search-hint">
              Presets keep each frog's colors and habitat, not the breed, so they work for any breed. Locks aren't saved.
            </p>

            <label className="color-save-option">
              <input type="radio" name="save-target" checked={!overwriting} onChange={() => setTarget('new')} />
              <span>Save as a new preset</span>
            </label>
            <input
              className="search-input color-save-name"
              type="text"
              value={name}
              maxLength={MAX_PRESET_NAME}
              placeholder="Preset name"
              aria-label="Preset name"
              autoFocus
              onFocus={() => setTarget('new')}
              onChange={e => { setName(e.target.value); setTarget('new'); }}
            />

            {saved.length > 0 && (
              <fieldset className="color-save-list">
                <legend>Or overwrite one of yours</legend>
                {saved.map(p => (
                  <div key={p.id} className="color-save-row">
                    <label className="color-save-option">
                      <input type="radio" name="save-target" checked={overwriting === p.id} onChange={() => setTarget(p.id)} />
                      <span>{p.name}</span>
                    </label>
                    {confirmDelete === p.id ? (
                      <button type="button" className="color-save-delete is-confirm" disabled={busy} onClick={() => remove(p.id)}>
                        Delete for good?
                      </button>
                    ) : (
                      <button type="button" className="color-save-delete" disabled={busy}
                        aria-label={`Delete ${p.name}`} onClick={() => setConfirmDelete(p.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </fieldset>
            )}

            {error && <p className="verify-flag-note">{error}</p>}
            <div className="crop-footer">
              <span />
              <div className="crop-buttons">
                <button type="submit" className="csv-btn" disabled={!canSave}>
                  {busy ? 'Saving…' : overwriting ? 'Overwrite' : 'Save'}
                </button>
                <button type="button" className="csv-btn" onClick={close} disabled={busy}>Cancel</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
