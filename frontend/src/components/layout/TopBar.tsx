export function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <span>Library</span>
      </div>

      <div className="topbar-actions">
        <button
          className="topbar-icon-button"
          type="button"
          aria-label="Search"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="m16 16 4 4" />
          </svg>
        </button>

        <div className="user-avatar" aria-label="VIZORA user">
          V
        </div>
      </div>
    </header>
  )
}