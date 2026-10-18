import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

// ── Content ───────────────────────────────────────────────────────────────────
// Sections and questions, in display order. Each `id` becomes the URL anchor
// (/faq#frog-ids), so keep them stable once published.

interface FaqItem {
  id:       string;
  question: string;
  answer:   ReactNode;
}

interface FaqSection {
  id:    string;
  title: string;
  items: FaqItem[];
}

const FAQ: FaqSection[] = [
  {
    id: 'general',
    title: 'General',
    items: [
      {
        id: 'what-is-pfdb',
        question: 'What is this site?',
        answer: <p>An unofficial, searchable database of information for the mobile game Pocket Frogs. It continues the original Google Sheet, with better data storage and room to grow past a spreadsheet.</p>,
      },
      {
        id: 'affiliation',
        question: 'Is this site affiliated with NimbleBit?',
        answer: <p>No. This is an unofficial fan project and isn't affiliated with or endorsed by NimbleBit.</p>,
      },
      {
        id: 'ai',
        question: 'Does the site use AI?',
        answer: <p>The site was built mostly with AI assistance, but it doesn't use any AI itself. All data is contributed by the community, and every calculation is written directly into the pages.</p>,
      },
    ],
  },
  {
    id: 'data',
    title: 'Data',
    items: [
      {
        id: 'data-source',
        question: 'Where does the data come from?',
        answer: <p>Players contribute it. Submissions are reviewed before they're added to the database.</p>,
      },
      {
        id: 'contribute',
        question: 'How can I contribute?',
        answer: <p>Use the pages under the Submit menu: <Link to="/submit/mutations">Mutations</Link>, <Link to="/submit/stats">Frog Stats</Link> and <Link to="/submit/details">Mutation Details</Link>.</p>,
      },
      {
        id: 'download',
        question: 'Can I download the data?',
        answer: <p>Yes. The <Link to="/download">Download</Link> page has each part of the database, with hashes and timestamps so you can check your copy matches the current data. API access isn't offered at this time.</p>,
      },
    ],
  },
  {
    id: 'using-the-site',
    title: 'Using the Site',
    items: [
      {
        id: 'frog-ids',
        question: 'What are the numbers like 18:11:0?',
        answer: <p>That's a Frog_ID: the base color, secondary color and breed codes the game uses, in that order. For example, Maroon Tingo Anura is 18:11:0. Pages use these in their links, so you can share a frog, pair or planner layout by copying the URL.</p>,
      },
      {
        id: 'spoilers',
        question: 'Why are some combinations hidden?',
        answer: <p>Known Glass and Chroma mutations count as spoilers. Turn Spoilers on in the settings menu (the gear icon) to show them.</p>,
      },
      {
        id: 'settings',
        question: 'What do the other settings do?',
        answer: <p>They set the theme, the sort order of breed and color lists, which platform's app updates you see by default, and whether you enter frogs with dropdowns or by typing an exact ID or name.</p>,
      },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    items: [
      {
        id: 'account-data',
        question: 'What data does my account store?',
        answer: <p>Only what's needed to identify you: your email and username. Sign-in is handled by external identity providers.</p>,
      },
    ],
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Faq() {
  const { hash } = useLocation();
  const [open, setOpen] = useState<Set<string>>(() => new Set(hash ? [hash.slice(1)] : []));
  const [tocOpen, setTocOpen] = useState(false);

  // Scroll to the anchored question or section on load.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const setItemOpen = (id: string, isOpen: boolean) =>
    setOpen(prev => {
      if (prev.has(id) === isOpen) return prev;
      const next = new Set(prev);
      if (isOpen) next.add(id); else next.delete(id);
      return next;
    });

  return (
    <div className="faq">
      <div className="faq-main">
        <h1>FAQ</h1>
        {FAQ.map(section => (
          <section key={section.id} id={section.id} className="faq-section">
            <h2 className="faq-section-title">{section.title}</h2>
            {section.items.map(item => (
              <details
                key={item.id}
                id={item.id}
                className="faq-item"
                open={open.has(item.id)}
                onToggle={e => setItemOpen(item.id, e.currentTarget.open)}
              >
                <summary className="faq-question">
                  <span>{item.question}</span>
                  <span className="weekly-expand-arrow" aria-hidden="true">▼</span>
                </summary>
                <div className="faq-answer">{item.answer}</div>
              </details>
            ))}
          </section>
        ))}
      </div>

      <aside className="faq-toc-wrap">
        <nav className={`frog-card faq-toc${tocOpen ? ' open' : ''}`} aria-label="FAQ contents">
          <button
            className="faq-toc-toggle"
            onClick={() => setTocOpen(o => !o)}
            aria-expanded={tocOpen}
          >
            <span className="daily-frog-panel-label">Contents</span>
            <span className={`weekly-expand-arrow${tocOpen ? ' open' : ''}`} aria-hidden="true">▼</span>
          </button>
          <span className="daily-frog-panel-label faq-toc-label">Contents</span>
          <ol className="faq-toc-list">
            {FAQ.map(section => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="faq-toc-section" onClick={() => setTocOpen(false)}>
                  {section.title}
                </a>
                <ol className="faq-toc-items">
                  {section.items.map(item => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="faq-toc-item"
                        onClick={() => { setItemOpen(item.id, true); setTocOpen(false); }}
                      >
                        {item.question}
                      </a>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
    </div>
  );
}
