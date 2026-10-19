import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useDailyFrog } from '../hooks/useDailyFrog';
import { fetchTable, fetchMutations, fetchFrogStats, type TeableRecord } from '../api/teable';
import { formatNum } from '../utils/format';
import { frogPath } from '../utils/frogIds';
import UpdateFeed from '../components/UpdateFeed';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface WeeklyFields extends Record<string, unknown> {
  SetName?:  string;
  SetDate?:  string;
  Stamp?:    number;
  LevelReq?: number;
  NameA?:    string;
  NameB?:    string;
  NameC?:    string;
  NameD?:    string;
  NameE?:    string;
  NameF?:    string;
  NameG?:    string;
  NameH?:    string;
}

const FROG_SLOTS = ['NameA', 'NameB', 'NameC', 'NameD', 'NameE', 'NameF', 'NameG', 'NameH'] as const;

// New sets release at 2pm Eastern Time on Monday. The "current week" is anchored
// to that cutoff: before 2pm ET on Monday we still report the previous week's
// string. Intl handles EST/EDT automatically.
function getCurrentISOWeek(): string {
  const now = new Date();

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'long',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const year    = parseInt(get('year'), 10);
  const month   = parseInt(get('month'), 10);
  const day     = parseInt(get('day'), 10);
  const weekday = get('weekday');
  const hour    = parseInt(get('hour') || '12', 10) % 24; // en-US can report '24' at midnight

  // Build a UTC date from the Eastern-Time calendar day so the ISO-week math
  // below is consistent regardless of where this code runs.
  const d = new Date(Date.UTC(year, month - 1, day));

  // Before 2pm ET on Monday, roll back to last week's set.
  if (weekday === 'Monday' && hour < 14) {
    d.setUTCDate(d.getUTCDate() - 7);
  }

  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
}

// ── Site summary card ──────────────────────────────────────────────────────────

function SiteSummaryCard() {
  // Counts come from the full tables already cached in IndexedDB by other pages,
  // so these add no network requests on a warm cache.
  const { data: breeds } = useQuery({ queryKey: ['table', 'breeds'], queryFn: () => fetchTable('breeds') });
  const { data: weekly } = useQuery({ queryKey: ['table', 'weekly'], queryFn: () => fetchTable('weekly') });
  const { data: mutations } = useQuery({ queryKey: ['mutations'], queryFn: fetchMutations });

  // The frogs table is too large to fetch in full — two aggregation calls instead.
  const { data: frogStats } = useQuery({
    queryKey: ['frog-stats'],
    queryFn: fetchFrogStats,
    staleTime: 60 * 60 * 1000,
  });

  const holders = frogStats?.topFrogs ?? [];

  // Popup listing the frog(s) holding the highest value.
  const [popupOpen, setPopupOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!popupOpen) return;
    function onDocClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setPopupOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [popupOpen]);

  const stats: { label: string; value: number | null | undefined; isMax?: boolean }[] = [
    { label: 'Frogs',         value: frogStats?.count },
    { label: 'Breeds',        value: breeds?.length },
    { label: 'Weekly Sets',   value: weekly?.length },
    { label: 'Highest Value', value: frogStats?.maxValue, isMax: true },
    { label: 'Combos', value: mutations?.length },
  ];

  return (
    <div className="summary-panel">
      <span className="updates-panel-label">Database Summary</span>
      <div className="summary-grid">
        {stats.map(s => (
          <div key={s.label} className="summary-stat">
            {s.isMax ? (
              <div className="summary-stat-popup-wrap" ref={popupRef}>
                <button
                  className="summary-stat-value summary-stat-link"
                  onClick={() => setPopupOpen(o => !o)}
                  disabled={holders.length === 0}
                  aria-expanded={popupOpen}
                >
                  {s.value == null ? '—' : formatNum(s.value)}
                </button>
                {popupOpen && holders.length > 0 && (
                  <div className="summary-popup">
                    {holders.map(h => (
                      <Link
                        key={h.id}
                        to={frogPath(h.frogId)}
                        className="summary-popup-link"
                        onClick={() => setPopupOpen(false)}
                      >
                        {h.fullname}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className="summary-stat-value">{s.value == null ? '—' : formatNum(s.value)}</span>
            )}
            <span className="summary-stat-label">
              {s.label}{s.isMax && holders.length > 1 ? ` (${holders.length})` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Update feed card ──────────────────────────────────────────────────────────

// Current and previous minor branches only; the rest lives on /changelog.
function UpdateFeedCard() {
  return (
    <UpdateFeed
      maxGroups={2}
      footer={<Link to="/changelog" className="updates-footer-link">Full Changelog →</Link>}
    />
  );
}

// ── Links card ────────────────────────────────────────────────────────────────

interface LinkEntry {
  label: string;
  url: string;
  icon?: string;         // full URL to override the auto-fetched favicon
  faviconDomain?: string; // override domain used for favicon lookup
}

const COMMUNITY_LINKS: LinkEntry[] = [
  { label: 'NimbleBit Official Site', url: 'https://nimblebit.com/#about' },
  { label: 'Android Download',      url: 'https://play.google.com/store/apps/details?id=com.nimblebit.pocketfrogs' },
  { label: 'iOS Download',          url: 'https://apps.apple.com/us/app/pocket-frogs-tiny-pond-keeper/id386644958' },
  { label: 'Community Discord',     url: 'https://discord.gg/XZ3eeEp', faviconDomain: 'discord.com' },
  { label: 'Community Subreddit',   url: 'https://www.reddit.com/r/Pocketfrogs' },
  { label: 'Community Wiki',        url: 'http://pocketfrogs.fandom.com/wiki/Pocket_Frogs_Wiki' },
  { label: 'Old Google Sheet',   url: 'https://docs.google.com/spreadsheets/d/1TNTK09vM8tlj6BC8haobuWCQvV4qNyDsRYsf-4hXdCc/', faviconDomain: 'sheets.google.com' }
];

function faviconSrc(entry: LinkEntry): string {
  if (entry.icon) return entry.icon;
  const domain = entry.faviconDomain ?? new URL(entry.url).hostname;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function LinksCard() {
  return (
    <div className="frog-card">
      <span className="daily-frog-panel-label">Links</span>
      <div className="links-list">
        {COMMUNITY_LINKS.map(entry => (
          <a
            key={entry.label}
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="links-row"
          >
            <img className="links-favicon" src={faviconSrc(entry)} alt="" width={16} height={16} />
            <span className="links-label">{entry.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function DailyFrogCard() {
  const { name, level, value, speed, stamina, isLoading } = useDailyFrog();

  return (
    <div className="frog-card">
      <span className="daily-frog-panel-label">PFDB Frog of the Day</span>
      <p className="daily-frog-panel-name">
        {isLoading ? 'Loading…' : (name ?? '—')}
      </p>
      {!isLoading && (
        <div className="daily-frog-stats daily-frog-stats--2col">
          <div className="daily-frog-stat">
            <span className="daily-frog-stat-label">Level</span>
            <span className="daily-frog-stat-value">{formatNum(level)}</span>
          </div>
          <div className="daily-frog-stat">
            <span className="daily-frog-stat-label">Value</span>
            <span className="daily-frog-stat-value">{formatNum(value)}</span>
          </div>
          <div className="daily-frog-stat">
            <span className="daily-frog-stat-label">Speed</span>
            <span className="daily-frog-stat-value">{formatNum(speed)}</span>
          </div>
          <div className="daily-frog-stat">
            <span className="daily-frog-stat-label">Stamina</span>
            <span className="daily-frog-stat-value">{formatNum(stamina)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklySetCard() {
  const [expanded, setExpanded] = useState(false);

  const { data: records, isLoading } = useQuery({
    queryKey: ['table', 'weekly'],
    queryFn: () => fetchTable<WeeklyFields>('weekly'),
  });

  const currentWeek = useMemo(() => getCurrentISOWeek(), []);

  const thisWeek: TeableRecord<WeeklyFields> | null =
    records?.find(r => r.fields.SetDate === currentWeek) ?? null;

  return (
    <div className="frog-card">
      <span className="daily-frog-panel-label">
        Weekly Set:{thisWeek?.fields.SetDate ? ` ${thisWeek.fields.SetDate}` : ''}
      </span>
      {isLoading ? (
        <p className="daily-frog-loading">Loading…</p>
      ) : thisWeek ? (
        <>
          <p className="daily-frog-panel-name">
            <Link
              to={`/weekly?q=${encodeURIComponent(thisWeek.fields.SetName ?? '')}`}
              className="plain-link"
            >
              {thisWeek.fields.SetName ?? '—'}
            </Link>
          </p>
          <div className="daily-frog-stats">

            <div className="daily-frog-stat">
              <span className="daily-frog-stat-label">Reward</span>
              <span className="daily-frog-stat-value">{formatNum(thisWeek.fields.Stamp)}</span>
            </div>
            <div className="daily-frog-stat">
              <span className="daily-frog-stat-label">Min Lvl</span>
              <span className="daily-frog-stat-value">{formatNum(thisWeek.fields.LevelReq)}</span>
            </div>
              <div className="daily-frog-stat">
              <span className="daily-frog-stat-label">Count</span>
              <span className="daily-frog-stat-value">
                {FROG_SLOTS.filter(slot => thisWeek.fields[slot]).length}
              </span>
            </div>
          </div>

          {expanded && (
            <ol className="weekly-frog-list">
              {FROG_SLOTS.map(slot => (
                <li key={slot} className="weekly-frog-item">
                  {thisWeek.fields[slot] || <span>&nbsp;</span>}
                </li>
              ))}
            </ol>
          )}

          <button
            className="weekly-expand-btn"
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse frog list' : 'Expand frog list'}
          >
            <span className={`weekly-expand-arrow${expanded ? ' open' : ''}`}>▼</span>
          </button>
        </>
      ) : (
        <p className="daily-frog-loading">No set found for {currentWeek}.</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

// Sidebar cards stick one below another (each offset by the heights above it)
// and earlier cards paint on top. When the column runs out of room the bottom
// card slides under the one above it first, so they collapse bottom-up.
function useStackedCards() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const cards = [...container.children] as HTMLElement[];
    const layout = () => {
      const gap = parseFloat(getComputedStyle(container).rowGap) || 0;
      let offset = 0;
      cards.forEach((card, i) => {
        card.style.setProperty('--stack-offset', `${offset}px`);
        card.style.zIndex = String(cards.length - i);
        offset += card.offsetHeight + gap;
      });
    };
    const observer = new ResizeObserver(layout);
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function Home() {
  const cardsRef = useStackedCards();
  return (
    <div className="home">
      <div className="home-main">
        <h1>Pocket Frogs Database</h1>
        <SiteSummaryCard />
        <UpdateFeedCard />
      </div>
      <div className="home-cards" ref={cardsRef}>
        <WeeklySetCard />
        <DailyFrogCard />
        <LinksCard />
      </div>
    </div>
  );
}
