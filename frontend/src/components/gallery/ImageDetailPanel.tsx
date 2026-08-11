import { useEffect } from 'react'

import type { VisualReference } from '../../types/image'

type ImageDetailPanelProps = {
  image: VisualReference
  onClose: () => void
}

export function ImageDetailPanel({
  image,
  onClose,
}: ImageDetailPanelProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="detail-panel-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="image-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="detail-panel-header">
          <div>
            <span className="detail-panel-eyebrow">
              Visual reference
            </span>

            <span className="detail-panel-id">
              {image.id}
            </span>
          </div>

          <button
            className="detail-panel-close"
            type="button"
            aria-label="Close image details"
            onClick={onClose}
            autoFocus
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="detail-panel-scroll">
          <div
            className="detail-preview"
            style={{
              aspectRatio: `${image.width} / ${image.height}`,
            }}
          >
            <img
              src={image.src}
              alt={image.alt}
            />
          </div>

          <section className="detail-title-section">
            <h2 id="image-detail-title">
              {image.title}
            </h2>

            <p>
              Visual reference saved in your VIZORA library.
            </p>
          </section>

          <section className="detail-section">
            <span className="detail-section-label">
              Information
            </span>

            <dl className="detail-metadata">
              <div>
                <dt>Dimensions</dt>

                <dd>
                  {image.width} × {image.height}
                </dd>
              </div>

              <div>
                <dt>Orientation</dt>

                <dd>
                  {getOrientation(image)}
                </dd>
              </div>

              <div>
                <dt>Reference ID</dt>

                <dd>{image.id}</dd>
              </div>
            </dl>
          </section>

          <section className="detail-section">
            <span className="detail-section-label">
              Tags
            </span>

            <div className="detail-tags">
              {image.tags.map((tag) => (
                <span key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <div className="ai-section-heading">
              <div>
                <span className="detail-section-label">
                  VIZORA Intelligence
                </span>

                <span className="ai-status">
                  Not analyzed
                </span>
              </div>

              <div
                className="ai-spark-icon"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24">
                  <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />
                  <path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
                </svg>
              </div>
            </div>

            <div className="ai-analysis-placeholder">
              <div className="ai-placeholder-row">
                <span>Style</span>
                <div />
              </div>

              <div className="ai-placeholder-row">
                <span>Mood</span>
                <div />
              </div>

              <div className="ai-placeholder-row">
                <span>Lighting</span>
                <div />
              </div>

              <div className="ai-placeholder-row">
                <span>Composition</span>
                <div />
              </div>

              <p>
                AI-generated visual insights will appear here once
                image analysis is connected.
              </p>
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}

function getOrientation(image: VisualReference) {
  if (image.width === image.height) {
    return 'Square'
  }

  return image.width > image.height
    ? 'Landscape'
    : 'Portrait'
}