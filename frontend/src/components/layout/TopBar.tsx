import type {
  FormEvent,
} from 'react'

type TopBarProps = {
  title: string

  searchQuery: string

  isSearching: boolean

  onSearchQueryChange: (
    query: string,
  ) => void

  onSearch: () => Promise<void>
}

export function TopBar({
  title,
  searchQuery,
  isSearching,
  onSearchQueryChange,
  onSearch,
}: TopBarProps) {
  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    void onSearch()
  }

  return (
    <header className="topbar">
      <div className="topbar-title">
        <span>
          {title}
        </span>
      </div>

      <div className="topbar-actions">
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
            placeholder="Search by meaning..."
            aria-label="Semantic search"
            onChange={(event) =>
              onSearchQueryChange(
                event.target.value,
              )
            }
          />

          {searchQuery && (
            <button
              type="submit"
              disabled={isSearching}
            >
              {isSearching
                ? 'Searching...'
                : 'Search'}
            </button>
          )}
        </form>

        <div
          className="user-avatar"
          aria-label="VIZORA user"
        >
          V
        </div>
      </div>
    </header>
  )
}