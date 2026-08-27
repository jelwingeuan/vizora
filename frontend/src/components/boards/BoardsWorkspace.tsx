import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import {
  addImageToBoard,
  createBoard,
  getBoards,
  removeImageFromBoard,
} from '../../services/boardService'

import {
  getImages,
} from '../../services/imageService'

import type {
  Board,
} from '../../types/board'

import type {
  VisualReference,
} from '../../types/image'

import './BoardsWorkspace.css'
import './BoardMembership.css'


export function BoardsWorkspace() {
  const [
    boards,
    setBoards,
  ] =
    useState<
      Board[]
    >([])

  const [
    libraryImages,
    setLibraryImages,
  ] =
    useState<
      VisualReference[]
    >([])

  const [
    selectedBoardId,
    setSelectedBoardId,
  ] =
    useState<
      string | null
    >(null)

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
    isAddPanelOpen,
    setIsAddPanelOpen,
  ] =
    useState(false)

  const [
    changingImageId,
    setChangingImageId,
  ] =
    useState<
      string | null
    >(null)

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

  const [
    membershipError,
    setMembershipError,
  ] =
    useState<
      string | null
    >(null)


  useEffect(() => {
    let isCancelled =
      false

    async function loadWorkspace() {
      setIsLoading(
        true,
      )

      setLoadError(
        null,
      )

      try {
        const [
          storedBoards,
          storedImages,
        ] =
          await Promise.all([
            getBoards(),
            getImages(),
          ])

        if (
          isCancelled
        ) {
          return
        }

        setBoards(
          storedBoards,
        )

        setLibraryImages(
          storedImages.map(
            (record) =>
              record.image,
          ),
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

    void loadWorkspace()

    return () => {
      isCancelled = true
    }
  }, [])


  const selectedBoard =
    selectedBoardId
      ? (
          boards.find(
            (board) =>
              board.id
              === selectedBoardId,
          )
          ?? null
        )
      : null


  const imageMap =
    new Map(
      libraryImages.map(
        (image) => [
          image.id,
          image,
        ] as const,
      ),
    )


  const boardImages =
    selectedBoard
      ? (
          selectedBoard
            .imageIds
            .map(
              (imageId) =>
                imageMap.get(
                  imageId,
                ),
            )
            .filter(
              (
                image,
              ): image is VisualReference =>
                Boolean(
                  image,
                ),
            )
        )
      : []


  const selectedImageIds =
    new Set(
      selectedBoard
        ?.imageIds
      ?? [],
    )


  const availableImages =
    libraryImages.filter(
      (image) =>
        !selectedImageIds.has(
          image.id,
        ),
    )


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


  function handleOpenBoard(
    board: Board,
  ) {
    setSelectedBoardId(
      board.id,
    )

    setIsAddPanelOpen(
      false,
    )

    setMembershipError(
      null,
    )
  }


  function handleBackToBoards() {
    setSelectedBoardId(
      null,
    )

    setIsAddPanelOpen(
      false,
    )

    setMembershipError(
      null,
    )
  }


  function replaceBoard(
    updatedBoard: Board,
  ) {
    setBoards(
      (
        currentBoards,
      ) =>
        currentBoards.map(
          (board) =>
            board.id
            === updatedBoard.id
              ? updatedBoard
              : board,
        ),
    )
  }


  async function handleAddImage(
    image: VisualReference,
  ) {
    if (
      !selectedBoard
      || changingImageId
    ) {
      return
    }

    setChangingImageId(
      image.id,
    )

    setMembershipError(
      null,
    )

    try {
      const updatedBoard =
        await addImageToBoard(
          selectedBoard.id,
          image.id,
        )

      replaceBoard(
        updatedBoard,
      )
    } catch (error) {
      setMembershipError(
        error instanceof Error
          ? error.message
          : (
              'Unable to add reference.'
            ),
      )
    } finally {
      setChangingImageId(
        null,
      )
    }
  }


  async function handleRemoveImage(
    image: VisualReference,
  ) {
    if (
      !selectedBoard
      || changingImageId
    ) {
      return
    }

    setChangingImageId(
      image.id,
    )

    setMembershipError(
      null,
    )

    try {
      const updatedBoard =
        await removeImageFromBoard(
          selectedBoard.id,
          image.id,
        )

      replaceBoard(
        updatedBoard,
      )
    } catch (error) {
      setMembershipError(
        error instanceof Error
          ? error.message
          : (
              'Unable to remove reference.'
            ),
      )
    } finally {
      setChangingImageId(
        null,
      )
    }
  }


  if (isLoading) {
    return (
      <div className="boards-workspace">
        <section className="boards-loading">
          <div className="boards-loading-indicator" />

          <span>
            Loading boards...
          </span>
        </section>
      </div>
    )
  }


  if (loadError) {
    return (
      <div className="boards-workspace">
        <p
          className="board-error"
          role="alert"
        >
          {loadError}
        </p>
      </div>
    )
  }


  if (selectedBoard) {
    return (
      <div className="boards-workspace">
        <section className="board-detail">
          <header className="board-detail-header">
            <div className="board-detail-copy">
              <button
                className="board-detail-back"
                type="button"
                onClick={
                  handleBackToBoards
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>

                <span>
                  All boards
                </span>
              </button>

              <span className="board-detail-label">
                Visual board
              </span>

              <h1>
                {selectedBoard.name}
              </h1>

              <p className="board-detail-description">
                {selectedBoard.description
                  ?? (
                    'A visual collection ready to take shape.'
                  )}
              </p>
            </div>

            <div className="board-detail-actions">
              <span className="board-detail-count">
                {boardImages.length}
                {' '}

                {boardImages.length === 1
                  ? 'reference'
                  : 'references'}
              </span>

              <button
                className="board-add-button"
                type="button"
                onClick={() =>
                  setIsAddPanelOpen(
                    (
                      current,
                    ) =>
                      !current,
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
                  Add references
                </span>
              </button>
            </div>
          </header>


          {membershipError && (
            <p
              className="board-membership-error"
              role="alert"
            >
              {membershipError}
            </p>
          )}


          {isAddPanelOpen && (
            <section className="board-add-panel">
              <header className="board-add-panel-header">
                <div>
                  <span className="board-section-label">
                    Library
                  </span>

                  <h2>
                    Add references
                  </h2>

                  <p>
                    Choose from uploaded
                    references saved in your
                    VIZORA library.
                  </p>
                </div>

                <button
                  className="board-panel-close"
                  type="button"
                  onClick={() =>
                    setIsAddPanelOpen(
                      false,
                    )
                  }
                >
                  Close
                </button>
              </header>


              {libraryImages.length === 0 ? (
                <div className="board-detail-empty">
                  <h2>
                    Your library is empty.
                  </h2>

                  <p>
                    Upload references in
                    Library first, then return
                    here to add them to this
                    board.
                  </p>
                </div>
              ) : availableImages.length === 0 ? (
                <div className="board-detail-empty">
                  <h2>
                    Everything is already here.
                  </h2>

                  <p>
                    All persisted library
                    references are already
                    inside this board.
                  </p>
                </div>
              ) : (
                <div className="board-picker-grid">
                  {availableImages.map(
                    (image) => (
                      <article
                        key={
                          image.id
                        }
                        className="board-picker-card"
                      >
                        <div className="board-picker-preview">
                          <img
                            src={
                              image.src
                            }
                            alt={
                              image.alt
                            }
                          />
                        </div>

                        <div className="board-picker-content">
                          <strong>
                            {image.title}
                          </strong>

                          <small>
                            {image.fileName
                              ?? 'Saved reference'}
                          </small>

                          <button
                            className="board-picker-add"
                            type="button"
                            disabled={
                              changingImageId
                              !== null
                            }
                            onClick={() => {
                              void handleAddImage(
                                image,
                              )
                            }}
                          >
                            {changingImageId
                              === image.id
                              ? 'Adding...'
                              : 'Add to board'}
                          </button>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>
          )}


          <section className="board-reference-section">
            <header className="board-reference-heading">
              <div>
                <span className="board-section-label">
                  References
                </span>

                <h2>
                  Board collection
                </h2>
              </div>
            </header>


            {boardImages.length === 0 ? (
              <div className="board-detail-empty">
                <h2>
                  No references yet.
                </h2>

                <p>
                  Add images from your
                  persisted VIZORA library to
                  begin shaping this board.
                </p>

                <button
                  className="boards-empty-button"
                  type="button"
                  onClick={() =>
                    setIsAddPanelOpen(
                      true,
                    )
                  }
                >
                  Add references
                </button>
              </div>
            ) : (
              <div className="board-reference-grid">
                {boardImages.map(
                  (image) => (
                    <article
                      key={
                        image.id
                      }
                      className="board-reference-card"
                    >
                      <div className="board-reference-image">
                        <img
                          src={
                            image.src
                          }
                          alt={
                            image.alt
                          }
                        />
                      </div>

                      <div className="board-reference-content">
                        <strong>
                          {image.title}
                        </strong>

                        <small>
                          {image.fileName
                            ?? 'Saved reference'}
                        </small>

                        <button
                          className="board-reference-remove"
                          type="button"
                          disabled={
                            changingImageId
                            !== null
                          }
                          onClick={() => {
                            void handleRemoveImage(
                              image,
                            )
                          }}
                        >
                          {changingImageId
                            === image.id
                            ? 'Removing...'
                            : 'Remove'}
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </section>
      </div>
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
              and start organizing saved
              references around it.
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


      {boards.length === 0 ? (
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
            (board) => {
              const previewImages =
                board.imageIds
                  .map(
                    (imageId) =>
                      imageMap.get(
                        imageId,
                      ),
                  )
                  .filter(
                    (
                      image,
                    ): image is VisualReference =>
                      Boolean(
                        image,
                      ),
                  )
                  .slice(
                    0,
                    4,
                  )

              return (
                <button
                  key={
                    board.id
                  }
                  className="board-card board-card-button"
                  type="button"
                  onClick={() =>
                    handleOpenBoard(
                      board,
                    )
                  }
                >
                  <div
                    className={
                      `board-card-preview ${
                        previewImages.length > 0
                          ? 'board-card-preview-has-images'
                          : ''
                      }`
                    }
                  >
                    {previewImages.length > 0 ? (
                      <div
                        className={
                          `board-preview-grid ${
                            getPreviewClassName(
                              previewImages.length,
                            )
                          }`
                        }
                      >
                        {previewImages.map(
                          (image) => (
                            <div
                              key={
                                image.id
                              }
                              className="board-preview-image"
                            >
                              <img
                                src={
                                  image.src
                                }
                                alt=""
                              />
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
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
                        {board.imageIds.length}
                        {' '}

                        {board.imageIds.length === 1
                          ? 'reference'
                          : 'references'}
                      </span>

                      <time
                        dateTime={
                          board.updatedAt
                        }
                      >
                        {formatBoardDate(
                          board.updatedAt,
                        )}
                      </time>
                    </div>
                  </div>
                </button>
              )
            },
          )}
        </section>
      )}
    </div>
  )
}


function getPreviewClassName(
  count: number,
) {
  switch (
    count
  ) {
    case 1:
      return (
        'board-preview-grid-one'
      )

    case 2:
      return (
        'board-preview-grid-two'
      )

    case 3:
      return (
        'board-preview-grid-three'
      )

    default:
      return (
        'board-preview-grid-four'
      )
  }
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