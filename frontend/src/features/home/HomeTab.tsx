/**
 * Home / landing page — full-width welcome page that fills all 3 LabBench slots.
 * Mirrors the Python app's Home tab: hero, vision, product cards, affiliations.
 */

interface HomeTabProps {
  onNavigate: (tab: string) => void
}

// ── Product cards ────────────────────────────────────────────────────────────

const PRODUCTS = [
  {
    logo: '/logos/ThotsakanStats.png',
    name: 'Thotsakan Statistics',
    tagline: 'Probability & Statistics Interactive Laboratory',
    description:
      'Explore data, test ideas, and connect statistical theory with computational experimentation.',
    status: 'active' as const,
    tab: 'probability',
    repo: 'https://github.com/IrvingGomez/ThotsakanStatistics',
  },
  {
    logo: '/logos/MaiyarapEq.png',
    name: 'Maiyarap Equations',
    tagline: 'Differential Equations Interactive Laboratory',
    description:
      'Explore dynamic systems, visualize solutions, and connect mathematical models with computational experimentation.',
    status: 'coming-soon' as const,
    tab: null,
    repo: null,
  },
]

const FEATURES = [
  { tab: 'data',        icon: '📁', label: 'Data',              desc: 'Load datasets and explore their structure' },
  { tab: 'probability', icon: '🎲', label: 'Probability',       desc: 'Explore distributions and model randomness' },
  { tab: 'estimation',  icon: '📐', label: 'Estimation',        desc: 'Summarize data and quantify uncertainty' },
  { tab: 'hypothesis',  icon: '🧪', label: 'Hypothesis Testing', desc: 'Evaluate claims and compare groups' },
  { tab: 'regression',  icon: '📈', label: 'Linear Regression',  desc: 'Model relationships and interpret evidence' },
]

const AFFILIATIONS = [
  { logo: '/logos/HimmapanLab.png', name: 'Himmapan Lab', size: 'h-14' },
  { logo: '/logos/CmklLogo.png',    name: 'CMKL University', size: 'h-12' },
  { logo: '/logos/AiceLogo.png',    name: 'AICE',           size: 'h-12' },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function HomeTab({ onNavigate }: HomeTabProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">

        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="text-center flex flex-col items-center gap-4">
          <img
            src="/logos/HimmapanLab.png"
            alt="Himmapan Lab"
            className="h-24 w-auto object-contain drop-shadow-lg"
            draggable={false}
          />
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
            Welcome to Himmapan Lab
          </h1>
          <p className="text-base text-[var(--color-text-muted)] max-w-xl leading-relaxed italic">
            Interactive mathematical tools built by students, for students.
          </p>
        </section>

        {/* ── VISION ───────────────────────────────────────── */}
        <section className="rounded-xl p-6 bg-[var(--color-bg-panel)] border border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-accent)] mb-4">Our Vision</h2>
          <ul className="flex flex-col gap-2.5 text-sm text-[var(--color-text-muted)] leading-relaxed">
            <li className="flex gap-2">
              <span className="text-[var(--color-accent)]">▸</span>
              <span><strong className="text-[var(--color-text)]">Teach with interaction:</strong> turn abstract concepts into experiments you can run.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-accent)]">▸</span>
              <span><strong className="text-[var(--color-text)]">Be transparent:</strong> methods are implemented clearly so students can learn from the code.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-accent)]">▸</span>
              <span><strong className="text-[var(--color-text)]">Grow an ecosystem:</strong> build multiple apps under one consistent engineering framework.</span>
            </li>
          </ul>
        </section>

        {/* ── PRODUCTS ─────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRODUCTS.map((product) => (
              <button
                key={product.name}
                type="button"
                disabled={product.status === 'coming-soon'}
                onClick={() => product.tab && onNavigate(product.tab)}
                className={`group rounded-xl p-5 text-left flex flex-col gap-3
                  bg-[var(--color-bg-panel)] border border-[var(--color-border)]
                  transition-all cursor-pointer
                  ${product.status === 'active'
                    ? 'hover:border-[var(--color-accent)] hover:shadow-lg hover:shadow-indigo-500/10'
                    : 'opacity-60 cursor-not-allowed'
                  }`}
              >
                <img
                  src={product.logo}
                  alt={product.name}
                  className="h-16 w-auto object-contain self-center"
                  draggable={false}
                />
                <h3 className="text-base font-semibold text-[var(--color-text)]">
                  {product.name}
                </h3>
                <p className="text-xs font-medium text-[var(--color-accent)]">{product.tagline}</p>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {product.description}
                </p>
                {product.status === 'coming-soon' && (
                  <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                    Coming soon
                  </span>
                )}
                {product.repo && (
                  <a
                    href={product.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] underline"
                  >
                    GitHub Repository →
                  </a>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ── QUICK START ──────────────────────────────────── */}
        <section className="rounded-xl p-6 bg-[var(--color-bg-panel)] border border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            About this Application
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Use the tabs at the top to explore:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {FEATURES.map((f) => (
              <button
                key={f.tab}
                type="button"
                onClick={() => onNavigate(f.tab)}
                className="flex items-start gap-2.5 rounded-lg p-3 text-left
                  hover:bg-white/5 transition-colors cursor-pointer"
              >
                <span className="text-lg mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{f.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{f.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── AFFILIATIONS ─────────────────────────────────── */}
        <section className="flex flex-col items-center gap-4 pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-8">
            {AFFILIATIONS.map((a) => (
              <img
                key={a.name}
                src={a.logo}
                alt={a.name}
                className={`${a.size} w-auto object-contain opacity-60 hover:opacity-90 transition-opacity`}
                draggable={false}
              />
            ))}
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] opacity-75">
            Built under <strong>Himmapan Lab</strong> for engineering education.
          </p>
        </section>

      </div>
    </div>
  )
}
