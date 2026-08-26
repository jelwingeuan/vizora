import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import {
  createBoard,
  getBoards,
} from '../../services/boardService'

import type {
  Board,
} from '../../types/board'

import './BoardsWorkspace.css'


export function BoardsWorkspace() {
  const [
    boards,
    setBoards,
  ] =
    useState<
      Board[]
    >([])

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)

  const [
    loadError,
    setLoadError,
  ] =
    useState<
      string | null
    >(null)

  const [
    isCreating,
    setIsCreating,
  ] =
    useState(false)

  const [
    isCreateFormOpen,
    setIsCreateFormOpen,
  ] =
    useState(false)

  const [
    name,
    setName,
  ] =
    useState('')

  const [
    description,
    setDescription,
  ] =
    useState('')

  const [
    createError,
    setCreateError,
  ] =
    useState<
      string | null
    >(null)


  useEffect(() => {
    let isCancelled =
      false

    async function loadBoards() {
      setIsLoading(
        true,
      )

      setLoadError(
        null,
      )

      try {
        const storedBoards =
          await getBoards()

        if (
          isCancelled
        ) {
          return
        }

        setBoards(
          storedBoards,
        )
      } catch (error) {
        if (
          isCancelled
        ) {
          return
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : (
                'Unable to load boards.'
              ),
        )
      } finally {
        if (
          !isCancelled
        ) {
          setIsLoading(
            false,
          )
        }
      }
    }

    void loadBoards()

    return () => {
      isCancelled = true
    }
  }, [])


  async function handleCreateBoard(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const normalizedName =
      name.trim()

    if (
      !normalizedName
      || isCreating
    ) {
      return
    }

    setIsCreating(
      true,
    )

    setCreateError(
      null,
    )

    try {
      const board =
        await createBoard({
          name:
            normalizedName,

          description:
            description.trim(),
        })

      setBoards(
        (
          currentBoards,
        ) => [
          board,
          ...currentBoards,
        ],
      )

      setName(
        '',
      )

      setDescription(
        '',
      )

      setIsCreateFormOpen(
        false,
      )
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : (
              'Unable to create board.'
            ),
      )
    } finally {
      setIsCreating(
        false,
      )
    }
  }


  function handleCancelCreate() {
    if (
      isCreating
    ) {
      return
    }

    setName(
      '',
    )

    setDescription(
      '',
    )

    setCreateError(
      null,
    )

    setIsCreateFormOpen(
      false,
    )
  }


  return (
    <div className="boards-workspace">
      <section className="boards-header">
        <div>
          <span className="eyebrow">
            Organize your inspiration
          </span>

          <h1>
            Boards
          </h1>

          <p>
            Group visual references around
            projects, characters,
            environments, styles, and
            creative directions.
          </p>
        </div>

        <div className="boards-header-actions">
          <span className="boards-count">
            {boards.length}
            {' '}

            {boards.length === 1
              ? 'board'
              : 'boards'}
          </span>

          <button
            className="boards-create-button"
            type="button"
            disabled={
              isCreateFormOpen
            }
            onClick={() =>
              setIsCreateFormOpen(
                true,
              )
            }
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 5v14" />

              <path d="M5 12h14" />
            </svg>

            <span>
              New board
            </span>
          </button>
        </div>
      </section>


      {isCreateFormOpen && (
        <section className="board-create-panel">
          <div className="board-create-copy">
            <span className="board-section-label">
              Create board
            </span>

            <h2>
              Start a new visual direction.
            </h2>

            <p>
              Give the board a clear name
              now. References can be added
              to it in the next stage.
            </p>
          </div>

          <form
            className="board-create-form"
            onSubmit={
              handleCreateBoard
            }
          >
            <label>
              <span>
                Board name
              </span>

              <input
                type="text"
                value={
                  name
                }
                maxLength={
                  100
                }
                disabled={
                  isCreating
                }
                autoFocus
                placeholder="e.g. Neon City Environment"
                onChange={
                  (event) =>
                    setName(
                      event.target.value,
                    )
                }
              />
            </label>

            <label>
              <span>
                Description
              </span>

              <textarea
                value={
                  description
                }
                maxLength={
                  500
                }
                disabled={
                  isCreating
                }
                placeholder="Optional notes about this direction..."
                rows={
                  4
                }
                onChange={
                  (event) =>
                    setDescription(
                      event.target.value,
                    )
                }
              />
            </label>

            {createError && (
              <p
                className="board-error"
                role="alert"
              >
                {createError}
              </p>
            )}

            <div className="board-create-actions">
              <button
                className="board-cancel-button"
                type="button"
                disabled={
                  isCreating
                }
                onClick={
                  handleCancelCreate
                }
              >
                Cancel
              </button>

              <button
                className="board-submit-button"
                type="submit"
                disabled={
                  isCreating
                  || !name.trim()
                }
              >
                {isCreating
                  ? 'Creating...'
                  : 'Create board'}
              </button>
            </div>
          </form>
        </section>
      )}


      {loadError && (
        <p
          className="board-error"
          role="alert"
        >
          {loadError}
        </p>
      )}


      {isLoading ? (
        <section className="boards-loading">
          <div className="boards-loading-indicator" />

          <span>
            Loading boards...
          </span>
        </section>
      ) : boards.length === 0 ? (
        <section className="boards-empty">
          <div
            className="boards-empty-icon"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h4l2 2h5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />

              <path d="M12 10v5" />

              <path d="M9.5 12.5h5" />
            </svg>
          </div>

          <span className="empty-library-label">
            Your boards
          </span>

          <h2>
            Create your first board.
          </h2>

          <p>
            Boards give your reference
            library structure by collecting
            ideas around a single visual
            direction or project.
          </p>

          <button
            className="boards-empty-button"
            type="button"
            onClick={() =>
              setIsCreateFormOpen(
                true,
              )
            }
          >
            Create board
          </button>
        </section>
      ) : (
        <section
          className="boards-grid"
          aria-label="Boards"
        >
          {boards.map(
            (board) => (
              <article
                key={
                  board.id
                }
                className="board-card"
              >
                <div className="board-card-preview">
                  <div
                    className="board-card-symbol"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h4l2 2h5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
                    </svg>
                  </div>

                  <span>
                    Ready for references
                  </span>
                </div>

                <div className="board-card-content">
                  <div>
                    <span className="board-card-label">
                      Board
                    </span>

                    <h2>
                      {board.name}
                    </h2>
                  </div>

                  <p>
                    {board.description
                      ?? (
                        'A new visual collection ready to take shape.'
                      )}
                  </p>

                  <div className="board-card-footer">
                    <span>
                      Created
                    </span>

                    <time
                      dateTime={
                        board.createdAt
                      }
                    >
                      {formatBoardDate(
                        board.createdAt,
                      )}
                    </time>
                  </div>
                </div>
              </article>
            ),
          )}
        </section>
      )}
    </div>
  )
}


function formatBoardDate(
  value: string,
) {
  const date =
    new Date(
      value,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat(
    undefined,

    {
      day:
        'numeric',

      month:
        'short',

      year:
        'numeric',
    },
  ).format(
    date,
  )
}