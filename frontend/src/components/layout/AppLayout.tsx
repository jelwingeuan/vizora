import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <TopBar />

        <main className="workspace">
          <section className="workspace-intro">
            <span className="eyebrow">Visual intelligence workspace</span>

            <h1>Your ideas, in one visual space.</h1>

            <p>
              Collect references, build visual boards, and eventually let AI
              help you understand and rediscover your creative library.
            </p>
          </section>

          <section
            className="empty-library"
            aria-label="Empty visual library"
          >
            <div className="empty-library-content">
              <div className="empty-library-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="16" rx="3" />
                  <circle cx="9" cy="10" r="2" />
                  <path d="m5.5 17 4.5-4 3 2.5 2.5-2 3 3" />
                </svg>
              </div>

              <span className="empty-library-label">Your library</span>

              <h2>Your visual library starts here.</h2>

              <p>
                Images, boards, references, and AI insights will appear here
                as we continue building VIZORA.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}