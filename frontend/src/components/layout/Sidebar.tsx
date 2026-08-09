export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">
          <span />
        </div>

        <div className="brand-copy">
          <span className="brand-name">VIZORA</span>
          <span className="brand-subtitle">Visual Intelligence</span>
        </div>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-section-label">Workspace</span>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <button className="nav-item nav-item-active" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="2" />
              <rect x="14" y="3" width="7" height="7" rx="2" />
              <rect x="3" y="14" width="7" height="7" rx="2" />
              <rect x="14" y="14" width="7" height="7" rx="2" />
            </svg>

            <span>Library</span>
          </button>

          <button className="nav-item" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h4l2 2h5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
            </svg>

            <span>Boards</span>
          </button>

          <button className="nav-item" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />
              <path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
            </svg>

            <span>Discover</span>
          </button>
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="status-dot" />
        <span>Local workspace</span>
      </div>
    </aside>
  )
}