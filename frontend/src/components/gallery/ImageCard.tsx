import {
  useState,
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


export function ImageCard({
  image,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}: ImageCardProps) {
  const [
    isMenuOpen,
    setIsMenuOpen,
  ] =
    useState(false)

  const [
    isManaging,
    setIsManaging,
  ] =
    useState(false)


  const canManage =
    image.source ===
      'upload'
    && Boolean(
      onRename,
    )
    && Boolean(
      onDelete,
    )


  async function handleRename() {
    if (!onRename) {
      return
    }

    const nextTitle =
      window.prompt(
        'Rename reference',
        image.title,
      )

    if (
      nextTitle ===
      null
    ) {
      return
    }

    const normalizedTitle =
      nextTitle.trim()

    if (
      !normalizedTitle
      || normalizedTitle ===
        image.title
    ) {
      setIsMenuOpen(
        false,
      )

      return
    }

    setIsManaging(
      true,
    )

    try {
      await onRename(
        image,
        normalizedTitle,
      )

      setIsMenuOpen(
        false,
      )

    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : (
              'Unable to rename image.'
            ),
      )

    } finally {
      setIsManaging(
        false,
      )
    }
  }


  async function handleDelete() {
    if (!onDelete) {
      return
    }

    const shouldDelete =
      window.confirm(
        `Delete “${image.title}”? `
        + 'This cannot be undone.',
      )

    if (!shouldDelete) {
      return
    }

    setIsManaging(
      true,
    )

    try {
      await onDelete(
        image,
      )

      setIsMenuOpen(
        false,
      )

    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : (
              'Unable to delete image.'
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

        {canManage && (
          <div className="image-card-overlay">
            <button
              className="image-card-action"
              type="button"
              aria-label={
                `More options for ${image.title}`
              }
              aria-expanded={
                isMenuOpen
              }
              disabled={
                isManaging
              }
              onClick={() =>
                setIsMenuOpen(
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

            {isMenuOpen && (
              <div
                role="menu"
                aria-label={
                  `Manage ${image.title}`
                }
                style={{
                  position:
                    'absolute',

                  top:
                    48,

                  right:
                    10,

                  zIndex:
                    4,

                  minWidth:
                    128,

                  padding:
                    6,

                  display:
                    'grid',

                  gap:
                    3,

                  border:
                    '1px solid rgba(255,255,255,0.12)',

                  borderRadius:
                    10,

                  background:
                    'rgba(15,16,21,0.96)',

                  boxShadow:
                    '0 14px 36px rgba(0,0,0,0.36)',

                  backdropFilter:
                    'blur(16px)',

                  pointerEvents:
                    'auto',
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={
                    isManaging
                  }
                  onClick={() => {
                    void handleRename()
                  }}
                  style={{
                    padding:
                      '8px 10px',

                    border:
                      0,

                    borderRadius:
                      7,

                    background:
                      'transparent',

                    color:
                      '#d6d8df',

                    fontSize:
                      11,

                    textAlign:
                      'left',

                    cursor:
                      'pointer',
                  }}
                >
                  Rename
                </button>

                <button
                  type="button"
                  role="menuitem"
                  disabled={
                    isManaging
                  }
                  onClick={() => {
                    void handleDelete()
                  }}
                  style={{
                    padding:
                      '8px 10px',

                    border:
                      0,

                    borderRadius:
                      7,

                    background:
                      'transparent',

                    color:
                      '#e58a94',

                    fontSize:
                      11,

                    textAlign:
                      'left',

                    cursor:
                      'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
              (tag) => (
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