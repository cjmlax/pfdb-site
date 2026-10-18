import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchChangelog, type ChangelogEntry } from '../api/teable';
import { usePlatform, type Platform } from '../hooks/usePlatform';

function formatUpdateDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
//Below formula is counter for highlighting an app update in the feed. First number is number of days and should be the adjusted value.
function isRecent(iso: string) {
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

// One feed entry per version. The poller records each store separately, so a
// version can have an iOS row, an Android row, or both; legacy "Both" rows
// (from the old iTunes poller) cover either platform.
interface VersionUpdate {
  version: string;
  latest: string; // newest date across platforms — drives the "new" highlight
  entries: Partial<Record<Platform, ChangelogEntry>>;
  split: boolean; // has platform-specific rows, so pills are shown for each one present
}

const PLATFORMS: Platform[] = ['iOS', 'Android'];

// Compares versions numerically segment by segment, so 3.10 sorts above 3.9
// rather than next to 3.1. Missing segments count as 0 (3.2 == 3.2.0).
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

// Ordered by version, newest first — release dates can disagree between
// platforms (e.g. a same-day patch on only one store), so they can't be trusted
// for ordering.
function groupByVersion(entries: ChangelogEntry[]): VersionUpdate[] {
  const versions = new Map<string, VersionUpdate>();
  for (const entry of entries) {
    let v = versions.get(entry.version);
    if (!v) {
      v = { version: entry.version, latest: entry.date, entries: {}, split: false };
      versions.set(entry.version, v);
    }
    if (entry.platform === 'Both') {
      for (const p of PLATFORMS) v.entries[p] ??= entry;
    } else {
      v.entries[entry.platform] = entry; // platform-specific row beats a legacy "Both"
      v.split = true;
    }
    if (entry.date > v.latest) v.latest = entry.date;
  }
  return [...versions.values()].sort((a, b) =>
    compareVersions(b.version, a.version) || b.latest.localeCompare(a.latest));
}

function groupByMinor(updates: VersionUpdate[]): [string, VersionUpdate[]][] {
  const groups = new Map<string, VersionUpdate[]>();
  for (const update of updates) {
    const key = update.version.split('.').slice(0, 2).join('.');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(update);
  }
  return [...groups.entries()];
}

function UpdateEntry({ update, selected, onSelect, className }: {
  update: VersionUpdate;
  selected: Platform;
  onSelect: (p: Platform) => void;
  className: string;
}) {
  // Fall back to whichever platform has this version if the selected one doesn't yet.
  const shown = update.entries[selected] ? selected : PLATFORMS.find(p => update.entries[p])!;
  const entry = update.entries[shown]!;
  return (
    <div className={className}>
      <div className="update-entry-header">
        <span className="update-version">v{update.version}</span>
        {update.split && (
          <span className="update-platform-pills" role="group" aria-label="Platform">
            {PLATFORMS.filter(p => update.entries[p]).map(p => (
              <button
                key={p}
                className={`update-platform-pill${p === shown ? ' active' : ''}`}
                onClick={() => onSelect(p)}
                aria-pressed={p === shown}
              >
                {p}
              </button>
            ))}
          </span>
        )}
        <span className="update-meta-sep">·</span>
        <span className="update-date">{formatUpdateDate(entry.date)}</span>
      </div>
      {entry.notes && <p className="update-notes">{entry.notes}</p>}
    </div>
  );
}

// The app update feed: the newest minor branch (e.g. v3.21.x) listed in full,
// older branches as collapsible groups. `maxGroups` caps how many branches are
// shown; `footer` sits below the scrolling feed.
export default function UpdateFeed({ maxGroups, className, footer }: {
  maxGroups?: number;
  className?: string;
  footer?: ReactNode;
}) {
  const { data: entries = [] } = useQuery({
    queryKey: ['changelog'],
    queryFn: fetchChangelog,
    staleTime: 60 * 60 * 1000,
  });
  const { platform } = usePlatform();

  const groups = useMemo(
    () => groupByMinor(groupByVersion(entries)).slice(0, maxGroups),
    [entries, maxGroups],
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Per-version platform picks. They're tied to the default they were made
  // under, so changing the site-wide setting resets every entry to it.
  const [picks, setPicks] = useState<{ base: Platform; byVersion: Record<string, Platform> }>(
    { base: platform, byVersion: {} },
  );
  const byVersion = picks.base === platform ? picks.byVersion : {};
  const selectedFor = (version: string) => byVersion[version] ?? platform;
  const pick = (version: string, p: Platform) =>
    setPicks({ base: platform, byVersion: { ...byVersion, [version]: p } });

  const toggleGroup = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  return (
    <div className={`updates-panel${className ? ` ${className}` : ''}`}>
      <span className="updates-panel-label">App Updates</span>
      <div className="updates-feed">
        {entries.length === 0 ? (
          <p className="updates-empty">Loading…</p>
        ) : (
          groups.map(([key, updates], gi) => {
            if (gi === 0) {
              return (
                <Fragment key={key}>
                  {updates.map((update, i) => (
                    <UpdateEntry
                      key={update.version}
                      update={update}
                      selected={selectedFor(update.version)}
                      onSelect={p => pick(update.version, p)}
                      className={`update-entry${i === 0 && isRecent(update.latest) ? ' update-entry--new' : ''}`}
                    />
                  ))}
                </Fragment>
              );
            }
            const isOpen = expanded.has(key);
            return (
              <div key={key} className="update-group">
                <button className="update-group-header" onClick={() => toggleGroup(key)} aria-expanded={isOpen}>
                  <span className="update-group-label">v{key}</span>
                  <span className="update-group-count">{updates.length} update{updates.length !== 1 ? 's' : ''}</span>
                  <span className={`weekly-expand-arrow${isOpen ? ' open' : ''}`}>▼</span>
                </button>
                {isOpen && updates.map(update => (
                  <UpdateEntry
                    key={update.version}
                    update={update}
                    selected={selectedFor(update.version)}
                    onSelect={p => pick(update.version, p)}
                    className="update-entry update-entry--grouped"
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
      {footer && <div className="updates-footer">{footer}</div>}
    </div>
  );
}
