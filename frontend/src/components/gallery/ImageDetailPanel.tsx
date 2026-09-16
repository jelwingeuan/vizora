import {
  useEffect,
  useState,
} from 'react'

import type {
  ImageAnalysis,
} from '../../types/analysis'

import type {
  VisualReference,
} from '../../types/image'

import {
  normalizeImageTag,
} from '../../utils/tags'


type ImageDetailPanelProps = {
  image:
    VisualReference

  analysis?:
    ImageAnalysis

  onAnalyze: (
    image:
      VisualReference,
  ) => Promise<void>

  onFindSimilar: (
    image:
      VisualReference,
  ) => Promise<void>

  onSetFavorite?: (
    image:
      VisualReference,

    isFavorite:
      boolean,
  ) => Promise<void>

  onClose:
    () => void
}


export function ImageDetailPanel({
  image,
  analysis,
  onAnalyze,
  onFindSimilar,
  onSetFavorite,
  onClose,
}: ImageDetailPanelProps) {
  const [
    isAnalyzing,
    setIsAnalyzing,
  ] =
    useState(false)

  const [
    analysisError,
    setAnalysisError,
  ] =
    useState<
      string | null
    >(null)

  const [
    isFindingSimilar,
    setIsFindingSimilar,
  ] =
    useState(false)

  const [
    similarityError,
    setSimilarityError,
  ] =
    useState<
      string | null
    >(null)

  const [
    isUpdatingFavorite,
    setIsUpdatingFavorite,
  ] =
    useState(false)

  const [
    favoriteError,
    setFavoriteError,
  ] =
    useState<
      string | null
    >(null)


  useEffect(() => {
    function handleKeyDown(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key ===
        'Escape'
      ) {
        onClose()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [
    onClose,
  ])


  async function handleAnalyze() {
    setIsAnalyzing(
      true,
    )

    setAnalysisError(
      null,
    )

    try {
      await onAnalyze(
        image,
      )

    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : (
              'Unable to analyze image.'
            ),
      )

    } finally {
      setIsAnalyzing(
        false,
      )
    }
  }


  async function handleFindSimilar() {
    setIsFindingSimilar(
      true,
    )

    setSimilarityError(
      null,
    )

    try {
      await onFindSimilar(
        image,
      )

      onClose()

    } catch (error) {
      setSimilarityError(
        error instanceof Error
          ? error.message
          : (
              'Unable to find similar images.'
            ),
      )

    } finally {
      setIsFindingSimilar(
        false,
      )
    }
  }


  async function handleFavorite() {
    if (
      !onSetFavorite
      || image.source !==
        'upload'
    ) {
      return
    }

    setIsUpdatingFavorite(
      true,
    )

    setFavoriteError(
      null,
    )

    try {
      await onSetFavorite(
        image,
        !image.isFavorite,
      )

    } catch (error) {
      setFavoriteError(
        error instanceof Error
          ? error.message
          : (
              'Unable to update favorite.'
            ),
      )

    } finally {
      setIsUpdatingFavorite(
        false,
      )
    }
  }


  return (
    <div
      className="detail-panel-backdrop"
      onClick={
        onClose
      }
      role="presentation"
    >
      <aside
        className="image-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-detail-title"
        onClick={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        <header className="detail-panel-header">
          <div className="detail-panel-header-copy">
            <span className="detail-panel-eyebrow">
              Reference details
            </span>

            <span className="detail-panel-id">
              {image.id}
            </span>
          </div>

          <button
            className="detail-panel-close"
            type="button"
            aria-label="Close image details"
            onClick={
              onClose
            }
            autoFocus
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M6 6l12 12" />

              <path d="M18 6 6 18" />
            </svg>
          </button>
        </header>


        <div className="detail-panel-scroll">
          <section className="detail-hero">
            <div
              className="detail-preview"
              style={{
                aspectRatio:
                  `${image.width} / ${image.height}`,
              }}
            >
              <img
                src={
                  image.src
                }
                alt={
                  image.alt
                }
              />

              <div className="detail-preview-badges">
                <span className="detail-preview-source">
                  {image.source ===
                  'upload'
                    ? 'Uploaded'
                    : 'Demo'}
                </span>

                {image.isFavorite && (
                  <span className="detail-preview-favorite">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />
                    </svg>

                    Favorite
                  </span>
                )}
              </div>
            </div>


            <div className="detail-title-section">
              <div className="detail-title-heading">
                <h2 id="image-detail-title">
                  {image.title}
                </h2>

                <span className="detail-orientation-pill">
                  {getOrientation(
                    image,
                  )}
                </span>
              </div>

              <p>
                {image.source ===
                'upload'
                  ? (
                      'Saved visual reference in your VIZORA library.'
                    )
                  : (
                      'Demo visual reference available for exploration.'
                    )}
              </p>
            </div>


            <div className="detail-primary-actions">
              {(
                image.source ===
                'upload'
              ) && onSetFavorite && (
                <button
                  className={
                    `detail-action-button detail-favorite-button ${
                      image.isFavorite
                        ? 'detail-favorite-button-active'
                        : ''
                    }`
                  }
                  type="button"
                  disabled={
                    isUpdatingFavorite
                  }
                  onClick={() => {
                    void handleFavorite()
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />
                  </svg>

                  {isUpdatingFavorite
                    ? 'Updating...'
                    : image.isFavorite
                      ? 'Remove favorite'
                      : 'Add to favorites'}
                </button>
              )}

              <button
                className="detail-action-button detail-similar-button"
                type="button"
                disabled={
                  isFindingSimilar
                }
                onClick={() => {
                  void handleFindSimilar()
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    cx="9"
                    cy="9"
                    r="4"
                  />

                  <circle
                    cx="15"
                    cy="15"
                    r="4"
                  />

                  <path d="m18 18 3 3" />
                </svg>

                {isFindingSimilar
                  ? 'Finding...'
                  : 'Find similar'}
              </button>
            </div>


            {favoriteError && (
              <p
                className="detail-inline-error"
                role="alert"
              >
                {favoriteError}
              </p>
            )}

            {similarityError && (
              <p
                className="detail-inline-error"
                role="alert"
              >
                {similarityError}
              </p>
            )}
          </section>


          <section className="detail-section detail-information-section">
            <div className="detail-section-heading">
              <div>
                <span className="detail-section-label">
                  Reference
                </span>

                <h3>
                  Information
                </h3>
              </div>
            </div>

            <dl className="detail-metadata">
              <div>
                <dt>
                  Dimensions
                </dt>

                <dd>
                  {image.width}
                  {' × '}
                  {image.height}
                </dd>
              </div>

              <div>
                <dt>
                  Orientation
                </dt>

                <dd>
                  {getOrientation(
                    image,
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Source
                </dt>

                <dd>
                  {image.source ===
                  'upload'
                    ? 'Upload'
                    : 'Demo'}
                </dd>
              </div>

              <div>
                <dt>
                  Saved
                </dt>

                <dd>
                  {formatSavedDate(
                    image.createdAt,
                  )}
                </dd>
              </div>

              {image.fileName && (
                <div className="detail-metadata-wide">
                  <dt>
                    File
                  </dt>

                  <dd
                    title={
                      image.fileName
                    }
                  >
                    {image.fileName}
                  </dd>
                </div>
              )}

              {typeof image.fileSize ===
                'number' && (
                <div>
                  <dt>
                    Size
                  </dt>

                  <dd>
                    {formatFileSize(
                      image.fileSize,
                    )}
                  </dd>
                </div>
              )}

              <div className="detail-metadata-wide">
                <dt>
                  Reference ID
                </dt>

                <dd
                  title={
                    image.id
                  }
                >
                  {image.id}
                </dd>
              </div>
            </dl>
          </section>


          <section className="detail-section detail-tags-section">
            <div className="detail-section-heading">
              <div>
                <span className="detail-section-label">
                  Organization
                </span>

                <h3>
                  Tags
                </h3>
              </div>

              <span className="detail-section-count">
                {image.tags.length}
              </span>
            </div>

            {image.tags.length >
              0 ? (
              <div className="detail-tags">
                {image.tags.map(
                  (
                    tag,
                  ) => {
                    const isAITag =
                      analysis
                        ?.tags
                        .some(
                          (
                            generatedTag,
                          ) =>
                            normalizeImageTag(
                              generatedTag,
                            )
                            ===
                            normalizeImageTag(
                              tag,
                            ),
                        )
                      ?? false

                    return (
                      <span
                        key={
                          tag
                        }
                        className={
                          isAITag
                            ? 'detail-tag-ai'
                            : undefined
                        }
                      >
                        {isAITag && (
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="m12 3 1.6 5.1L19 10l-5.4 1.9L12 17l-1.6-5.1L5 10l5.4-1.9z" />
                          </svg>
                        )}

                        {tag}
                      </span>
                    )
                  },
                )}
              </div>
            ) : (
              <p className="detail-empty-copy">
                No tags have been added yet.
              </p>
            )}
          </section>


          <section className="detail-section detail-intelligence-section">
            <div className="detail-intelligence-header">
              <div className="detail-intelligence-heading">
                <div className="detail-ai-mark">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />

                    <path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
                  </svg>
                </div>

                <div>
                  <span className="detail-section-label">
                    VIZORA Intelligence
                  </span>

                  <h3>
                    Visual analysis
                  </h3>
                </div>
              </div>

              <span
                className={
                  `detail-analysis-status ${
                    analysis
                      ? 'detail-analysis-status-complete'
                      : ''
                  }`
                }
              >
                <span />

                {analysis
                  ? 'Analyzed'
                  : 'Not analyzed'}
              </span>
            </div>


            <button
              className="detail-analyze-button"
              type="button"
              disabled={
                isAnalyzing
              }
              onClick={() => {
                void handleAnalyze()
              }}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />
              </svg>

              <span>
                {isAnalyzing
                  ? 'Analyzing...'
                  : analysis
                    ? 'Analyze again'
                    : 'Analyze image'}
              </span>

              {!isAnalyzing && (
                <svg
                  className="detail-analyze-arrow"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              )}
            </button>


            {analysisError && (
              <p
                className="detail-inline-error"
                role="alert"
              >
                {analysisError}
              </p>
            )}


            {analysis ? (
              <AIAnalysisView
                analysis={
                  analysis
                }
              />
            ) : (
              <div className="detail-analysis-empty">
                <div className="detail-analysis-empty-grid">
                  <span>
                    Style
                  </span>

                  <span>
                    Mood
                  </span>

                  <span>
                    Lighting
                  </span>

                  <span>
                    Composition
                  </span>
                </div>

                <p>
                  Analyze this reference to generate
                  style, mood, lighting, composition,
                  color, tags and creative notes.
                </p>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}


type AIAnalysisViewProps = {
  analysis:
    ImageAnalysis
}


function AIAnalysisView({
  analysis,
}: AIAnalysisViewProps) {
  return (
    <div className="detail-analysis-content">
      <div className="detail-analysis-summary">
        <span>
          AI Summary
        </span>

        <p>
          {analysis.summary}
        </p>
      </div>


      <div className="detail-analysis-block">
        <span className="detail-analysis-label">
          Subject
        </span>

        <p>
          {analysis.subject}
        </p>
      </div>


      <div className="detail-analysis-block">
        <span className="detail-analysis-label">
          Style
        </span>

        <div className="detail-analysis-values">
          {analysis.style.map(
            (
              value,
            ) => (
              <span
                key={
                  value
                }
              >
                {value}
              </span>
            ),
          )}
        </div>
      </div>


      <div className="detail-analysis-block">
        <span className="detail-analysis-label">
          Mood
        </span>

        <div className="detail-analysis-values">
          {analysis.mood.map(
            (
              value,
            ) => (
              <span
                key={
                  value
                }
              >
                {value}
              </span>
            ),
          )}
        </div>
      </div>


      <div className="detail-analysis-grid">
        <div className="detail-analysis-block">
          <span className="detail-analysis-label">
            Lighting
          </span>

          <p>
            {analysis.lighting}
          </p>
        </div>

        <div className="detail-analysis-block">
          <span className="detail-analysis-label">
            Composition
          </span>

          <p>
            {analysis.composition}
          </p>
        </div>
      </div>


      <div className="detail-analysis-block">
        <span className="detail-analysis-label">
          Color palette
        </span>

        <div className="detail-color-palette">
          {analysis.color_palette.map(
            (
              color,
            ) => (
              <div
                key={
                  color
                }
                className="detail-color"
              >
                <span
                  className="detail-color-swatch"
                  style={{
                    backgroundColor:
                      color,
                  }}
                />

                <small>
                  {color}
                </small>
              </div>
            ),
          )}
        </div>
      </div>


      <div className="detail-analysis-block">
        <span className="detail-analysis-label">
          AI tags
        </span>

        <div className="detail-analysis-values detail-analysis-tags">
          {analysis.tags.map(
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


      <div className="detail-analysis-block detail-creative-notes">
        <span className="detail-analysis-label">
          Creative notes
        </span>

        <p>
          {analysis.creative_notes}
        </p>
      </div>
    </div>
  )
}


function getOrientation(
  image:
    VisualReference,
) {
  if (
    image.width ===
    image.height
  ) {
    return 'Square'
  }

  return (
    image.width >
    image.height
      ? 'Landscape'
      : 'Portrait'
  )
}


function formatSavedDate(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return '—'
  }

  const date =
    new Date(
      value,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      year:
        'numeric',

      month:
        'short',

      day:
        'numeric',
    },
  ).format(
    date,
  )
}


function formatFileSize(
  bytes:
    number,
) {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`
  }

  const kilobytes =
    bytes /
    1024

  if (
    kilobytes <
    1024
  ) {
    return `${kilobytes.toFixed(1)} KB`
  }

  const megabytes =
    kilobytes /
    1024

  return `${megabytes.toFixed(1)} MB`
}