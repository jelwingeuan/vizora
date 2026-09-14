import type {
  FormEvent,
} from 'react'


type TopBarProps = {
  title:
    string

  searchQuery:
    string

  isSearching:
    boolean

  onSearchQueryChange: (
    query:
      string,
  ) => void

  onSearch:
    () => Promise<void>
}


export function TopBar({
  title,
  searchQuery,
  isSearching,
  onSearchQueryChange,
  onSearch,
}: TopBarProps) {
  const isLibrary =
    title ===
    'Library'

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    void onSearch()
  }

  return (
    <header className="topbar">
      <div className="topbar-context">
        <span className="topbar-context-label">
          Workspace
        </span>

        <div className="topbar-title">
          <span>
            {title}
          </span>

          <span
            className="topbar-title-status"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="topbar-actions">
        <div className="topbar-search-group">
          {!isLibrary && (
            <span className="topbar-search-scope">
              Searches Library
            </span>
          )}

          <form
            className="semantic-search"
            role="search"
            onSubmit={handleSubmit}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="6"
              />

              <path d="m16 16 4 4" />
            </svg>

            <input
              type="search"
              value={searchQuery}
              placeholder="Search Library by meaning..."
              aria-label="Search the visual library by meaning"
              onChange={(
                event,
              ) =>
                onSearchQueryChange(
                  event
                    .target
                    .value,
                )
              }
            />

            {searchQuery && (
              <button
                type="submit"
                disabled={
                  isSearching
                }
              >
                {isSearching
                  ? 'Searching...'
                  : 'Search'}
              </button>
            )}
          </form>
        </div>

        <div
          className="user-chip"
          aria-label="Private VIZORA workspace"
        >
          <div
            className="user-avatar"
            aria-hidden="true"
          >
            V
          </div>

          <div className="user-chip-copy">
            <span>
              Owner
            </span>

            <small>
              Private workspace
            </small>
          </div>
        </div>
      </div>
    </header>
  )
}