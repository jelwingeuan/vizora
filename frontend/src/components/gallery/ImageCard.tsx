import {
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  FormEvent,
} from 'react'

import type {
  VisualReference,
} from '../../types/image'


type ImageCardProps = {
  image:
    VisualReference

  isSelected:
    boolean

  onSelect: (
    image:
      VisualReference,
  ) => void

  onRename?: (
    image:
      VisualReference,

    title:
      string,
  ) => Promise<void>

  onDelete?: (
    image:
      VisualReference,
  ) => Promise<void>
}


type ManagementView =
  | 'menu'
  | 'rename'
  | 'delete'
  | null


export function ImageCard({
  image,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}: ImageCardProps) {
  const [
    managementView,
    setManagementView,
  ] =
    useState<
      ManagementView
    >(null)

  const [
    draftTitle,
    setDraftTitle,
  ] =
    useState(
      image.title,
    )

  const [
    isManaging,
    setIsManaging,
  ] =
    useState(false)

  const [
    managementError,
    setManagementError,
  ] =
    useState<
      string | null
    >(null)

  const managementRef =
    useRef<
      HTMLDivElement
      | null
    >(null)


  const canManage =
    image.source ===
      'upload'
    && Boolean(
      onRename,
    )
    && Boolean(
      onDelete,
    )


  useEffect(() => {
    if (
      managementView ===
      null
    ) {
      return
    }


    function handlePointerDown(
      event:
        PointerEvent,
    ) {
      if (
        isManaging
      ) {
        return
      }

      const target =
        event.target

      if (
        !(target instanceof Node)
      ) {
        return
      }

      if (
        managementRef
          .current
          ?.contains(
            target,
          )
      ) {
        return
      }

      setManagementView(
        null,
      )

      setManagementError(
        null,
      )

      setDraftTitle(
        image.title,
      )
    }


    function handleKeyDown(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key !==
          'Escape'
        || isManaging
      ) {
        return
      }

      setManagementView(
        null,
      )

      setManagementError(
        null,
      )

      setDraftTitle(
        image.title,
      )
    }


    window.addEventListener(
      'pointerdown',
      handlePointerDown,
    )

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )


    return () => {
      window.removeEventListener(
        'pointerdown',
        handlePointerDown,
      )

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [
    managementView,
    isManaging,
    image.title,
  ])


  function openMenu() {
    if (
      isManaging
    ) {
      return
    }

    setManagementError(
      null,
    )

    setDraftTitle(
      image.title,
    )

    setManagementView(
      (
        currentView,
      ) =>
        currentView ===
        null
          ? 'menu'
          : null,
    )
  }


  function openRename() {
    setDraftTitle(
      image.title,
    )

    setManagementError(
      null,
    )

    setManagementView(
      'rename',
    )
  }


  function openDelete() {
    setManagementError(
      null,
    )

    setManagementView(
      'delete',
    )
  }


  function returnToMenu() {
    if (
      isManaging
    ) {
      return
    }

    setManagementError(
      null,
    )

    setDraftTitle(
      image.title,
    )

    setManagementView(
      'menu',
    )
  }


  async function handleRename(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      !onRename
    ) {
      return
    }


    const normalizedTitle =
      draftTitle.trim()


    if (
      !normalizedTitle
    ) {
      setManagementError(
        'Enter a name for this reference.',
      )

      return
    }


    if (
      normalizedTitle ===
      image.title
    ) {
      setManagementView(
        null,
      )

      setManagementError(
        null,
      )

      return
    }


    setIsManaging(
      true,
    )

    setManagementError(
      null,
    )


    try {
      await onRename(
        image,
        normalizedTitle,
      )

      setManagementView(
        null,
      )

    } catch (error) {
      setManagementError(
        error instanceof Error
          ? error.message
          : (
              'Unable to rename this reference.'
            ),
      )

    } finally {
      setIsManaging(
        false,
      )
    }
  }


  async function handleDelete() {
    if (
      !onDelete
    ) {
      return
    }

    setIsManaging(
      true,
    )

    setManagementError(
      null,
    )


    try {
      await onDelete(
        image,
      )

      setManagementView(
        null,
      )

    } catch (error) {
      setManagementError(
        error instanceof Error
          ? error.message
          : (
              'Unable to delete this reference.'
            ),
      )

    } finally {
      setIsManaging(
        false,
      )
    }
  }


  return (
    <article
      className={
        `image-card ${
          isSelected
            ? 'image-card-selected'
            : ''
        }`
      }
    >
      <div
        className="image-card-media"
        style={{
          aspectRatio:
            `${image.width} / ${image.height}`,
        }}
      >
        <button
          className="image-card-select"
          type="button"
          onClick={() =>
            onSelect(
              image,
            )
          }
          aria-label={
            `Open ${image.title}`
          }
        >
          <img
            src={
              image.src
            }
            alt={
              image.alt
            }
            loading="lazy"
          />
        </button>
      </div>


      {canManage && (
        <div
          ref={
            managementRef
          }
          className={
            `image-card-management ${
              managementView
                ? (
                    'image-card-management-open'
                  )
                : ''
            }`
          }
        >
          <button
            className="image-card-action"
            type="button"
            aria-label={
              `Manage ${image.title}`
            }
            aria-haspopup="menu"
            aria-expanded={
              managementView !==
              null
            }
            disabled={
              isManaging
            }
            onClick={
              openMenu
            }
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="5"
                cy="12"
                r="1.3"
              />

              <circle
                cx="12"
                cy="12"
                r="1.3"
              />

              <circle
                cx="19"
                cy="12"
                r="1.3"
              />
            </svg>
          </button>


          {managementView ===
          'menu' && (
            <div
              className="image-management-popover image-management-menu"
              role="menu"
              aria-label={
                `Manage ${image.title}`
              }
            >
              <button
                className="image-management-menu-item"
                type="button"
                role="menuitem"
                onClick={
                  openRename
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" />

                  <path d="m13.5 6.5 4 4" />
                </svg>

                Rename
              </button>

              <button
                className="image-management-menu-item image-management-menu-item-danger"
                type="button"
                role="menuitem"
                onClick={
                  openDelete
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M4 7h16" />

                  <path d="M9 7V4h6v3" />

                  <path d="m6 7 1 13h10l1-13" />
                </svg>

                Delete
              </button>
            </div>
          )}


          {managementView ===
          'rename' && (
            <form
              className="image-management-popover image-management-dialog"
              aria-label={
                `Rename ${image.title}`
              }
              onSubmit={
                handleRename
              }
            >
              <div className="image-management-dialog-heading">
                <span>
                  Rename reference
                </span>

                <small>
                  Give this reference a clearer name.
                </small>
              </div>

              <input
                className="image-management-input"
                type="text"
                value={
                  draftTitle
                }
                maxLength={
                  255
                }
                disabled={
                  isManaging
                }
                autoFocus
                onChange={
                  (
                    event,
                  ) =>
                    setDraftTitle(
                      event.target.value,
                    )
                }
              />

              {managementError && (
                <p
                  className="image-management-error"
                  role="alert"
                >
                  {managementError}
                </p>
              )}

              <div className="image-management-actions">
                <button
                  className="image-management-secondary"
                  type="button"
                  disabled={
                    isManaging
                  }
                  onClick={
                    returnToMenu
                  }
                >
                  Cancel
                </button>

                <button
                  className="image-management-primary"
                  type="submit"
                  disabled={
                    isManaging
                  }
                >
                  {isManaging
                    ? 'Saving...'
                    : 'Save'}
                </button>
              </div>
            </form>
          )}


          {managementView ===
          'delete' && (
            <div
              className="image-management-popover image-management-dialog"
              role="dialog"
              aria-modal="false"
              aria-label={
                `Delete ${image.title}`
              }
            >
              <div className="image-management-dialog-heading">
                <span>
                  Delete reference?
                </span>

                <small>
                  This will permanently remove
                  <strong>
                    {' '}
                    {image.title}
                  </strong>
                  {' '}
                  from your library and boards.
                </small>
              </div>

              {managementError && (
                <p
                  className="image-management-error"
                  role="alert"
                >
                  {managementError}
                </p>
              )}

              <div className="image-management-actions">
                <button
                  className="image-management-secondary"
                  type="button"
                  disabled={
                    isManaging
                  }
                  onClick={
                    returnToMenu
                  }
                >
                  Cancel
                </button>

                <button
                  className="image-management-danger"
                  type="button"
                  disabled={
                    isManaging
                  }
                  onClick={() => {
                    void handleDelete()
                  }}
                >
                  {isManaging
                    ? 'Deleting...'
                    : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      <div className="image-card-info">
        <h3>
          {image.title}
        </h3>

        <div className="image-card-tags">
          {image.tags
            .slice(
              0,
              2,
            )
            .map(
              (
                tag,
              ) => (
                <span
                  key={
                    tag
                  }
                >
                  {tag}
                </span>
              ),
            )}
        </div>
      </div>
    </article>
  )
}