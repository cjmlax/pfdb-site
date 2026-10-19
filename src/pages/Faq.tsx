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
    id: 'about-the-site',
    title: 'About the Site',
    items: [
      {
        id: 'what-is',
        question: 'What is this site for?',
        answer: <p>This is a community-sourced database of information for the mobile game <a href="https://nimblebit.com" target="_blank" rel="noopener noreferrer">Pocket Frogs</a>. This includes values, set information, and other notable data points for players who are looking to optimize or expand their play beyond a casual user.</p>,
      },
      {
        id: 'data-source',
        question: 'Where does the data come from?',
        answer: <p>Users previously contributed to a Google Spreadsheet I created that was open for public editing. That data has been moved here and expanded to collect more data types.</p>,
      },
      {
        id: 'use-data',
        question: 'Can I download the data?',
        answer: <p>Yes, the <Link to="/download">Download</Link> page has downloads of database components as Comma Separated Values (CSV) files. Additional methods/formats may be added in the future.</p>
      },
      {
        id: 'google-sheet',
        question: 'What will happen to the Google Sheet?',
        answer: <p>As of now, the Google Sheet is still live and available for public editing. The future plan is to make it read-only and then eventually delete it entirely. Spreadsheets aren't the proper way to store relational data and I'd prefer some distance between my personal account, the community, and Google, so the Sheet needs to come down eventually.</p>,
      },
      {
        id: 'contribute',
        question: 'How can I contribute?',
        answer: <p>Information about specific frogs doesn't often change, but <Link to="/submit/stats">missing data</Link> and errors can be reported if you spot them. Primarily, we need reports of frog pairs that produce a glass or chroma result when bread, which can be submitted through the Mutations <Link to="/submit/mutations">submission page</Link>.</p>,
      },
    ],
  },
  {
    id: 'data',
    title: 'About the Data',
    items: [
      {
        id: 'values',
        question: 'What data points do you collect?',
        answer: <p>The main data points are the frog's value, speed, and stamina, visible when viewing a frog you have or in the Froggydex for collected frogs. We also collect validation breeding pairs resulting in either expected results frogs or mutations.</p>,
      },
      {
        id: 'what-is-mutation',
        question: 'What do you mean by Mutations?',
        answer: <p>The game has a mechanic where, when breeding two frogs together, a potential resulting frog can have either the chroma or glass attributes replace an original one. While the pairings where this happens are random, they are always the same for every player.</p>,
      },
      {
        id: 'mutation-example',
        question: 'How do I know if a mutation can happen?',
        answer: <p>The game has a mechanic where, when breeding two frogs together, a potential resulting frog can have either the chroma or glass attributes replace an original one. While the pairings where this happens are random, they are always the same for every player.</p>,
      },      
      {
        id: 'frog-ids',
        question: 'What are the numbers like 18:11:0?',
        answer: <p>Rather than using full names of frogs, the game encodes each combination of attributes as a three-digit sequence. The first is the base/primary color, the second is the accent/secondary color, and the third is the breed/pattern. You may also see a leading "1:" in other resources, this is a quantity indicator that isn't used on this site.</p>,
      },
    ],
  }, 
// Some AI-generated defaults. Good questions to answer so I'll keep them, but want to answer and structure them properly later.
//      {
//        id: 'affiliation',
//        question: 'Is this site affiliated with NimbleBit?',
//        answer: <p>No. This is an unofficial fan project and isn't affiliated with or endorsed by NimbleBit.</p>,
//      },
//      {
//        id: 'ai',
//        question: 'Does the site use AI?',
//        answer: <p>The site was built mostly with AI assistance, but it doesn't use any AI itself. All data is contributed by the community, and every calculation is written directly into the pages.</p>,
//      },
//      {
//        id: 'spoilers',
//        question: 'Why are some combinations hidden?',
//        answer: <p>Known Glass and Chroma mutations count as spoilers. Turn Spoilers on in the settings menu (the gear icon) to show them.</p>,
//      },
//      {
//        id: 'settings',
//        question: 'What do the other settings do?',
//        answer: <p>They set the theme, the sort order of breed and color lists, which platform's app updates you see by default, and whether you enter frogs with dropdowns or by typing an exact ID or name.</p>,
//      },
  {
    id: 'accounts',
    title: 'Accounts and Privacy',
    items: [
      {
        id: 'require-login',
        question: 'Do I have to have an account to access data?',
        answer: <p>No, there are no restrictions on accessing data based on login. The site is fully navigable without an account.</p>,
      },
      {
        id: 'login-needed',
        question: 'What is the login needed for?',
        answer: <p>Currently, login is needed for certain features like receiving credit for Mutation submissions. Additionally, mods and admins require accounts to perform extra tasks associated with those roles. Additional features are planned for accounts but aren't implemented yet.</p>,
      },
      {
        id: 'account-data',
        question: 'What data does my account store?',
        answer: <p>When connecting a service, only the base level OAuth/OICD information from a service is requested. I only use the information to identify and authenticate you, which requires only storing the username, user ID, and email provided by that service.</p>,
      },
      {
        id: 'local-accounts',
        question: 'Why can\'t I create an account just for this site?',
        answer: <p>Most people reuse credentials from other sites anyways, and not having to store them means I am not a vector for compromised accounts elsewhere in the event of a breach. Local accounts would put unnecessary stress on a basic site like this, so connected accounts make sense.</p>,
      },
      {
        id: 'more-login-providers',
        question: 'Are you going to add support for [site]?',
        answer: <p>I'll try to support as many services as I can, but I won't make and promises. For example, Reddit has very restrictive access to their API/Auth endpoints and I have been denied a developer account with them, so that one will not be implemented until I can clear that hurdle.</p>,
      },
    ],
  },
  {
    id: 'general',
    title: 'General Information',
    items: [
      {
        id: 'wip',
        question: 'WIP',
        answer: <p>This section is a work in progress.</p>,
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
              </li>
            ))}
          </ol>
        </nav>
      </aside>
    </div>
  );
}
