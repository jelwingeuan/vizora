import {
  useEffect,
  useState,
} from 'react'

import type { ImageAnalysis } from '../../types/analysis'
import type { VisualReference } from '../../types/image'

import {
  normalizeImageTag,
} from '../../utils/tags'

type ImageDetailPanelProps = {
  image: VisualReference

  analysis?: ImageAnalysis

  onAnalyze: (
    image: VisualReference,
  ) => Promise<void>

  onClose: () => void
}

export function ImageDetailPanel({
  image,
  analysis,
  onAnalyze,
  onClose,
}: ImageDetailPanelProps) {
  const [isAnalyzing, setIsAnalyzing] =
    useState(false)

  const [analysisError, setAnalysisError] =
    useState<string | null>(null)

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === 'Escape') {
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
  }, [onClose])

  async function handleAnalyze() {
    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      await onAnalyze(image)
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : 'Unable to analyze image.',
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

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
        onClick={(event) =>
          event.stopPropagation()
        }
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
          <div
            className="detail-preview"
            style={{
              aspectRatio:
                `${image.width} / ${image.height}`,
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
              Visual reference saved in your
              VIZORA library.
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

                <dd>
                  {image.id}
                </dd>
              </div>
            </dl>
          </section>

          <section className="detail-section">
            <span className="detail-section-label">
              Tags
            </span>

            <div className="detail-tags">
              {image.tags.map((tag) => {
                const isAITag =
                  analysis?.tags.some(
                    (generatedTag) =>
                      normalizeImageTag(
                        generatedTag,
                      ) ===
                      normalizeImageTag(tag),
                  ) ?? false

                return (
                  <span
                    key={tag}
                    className={
                      isAITag
                        ? 'detail-tag-ai'
                        : undefined
                    }
                  >
                    {tag}
                  </span>
                )
              })}
            </div>
          </section>

          <section className="detail-section">
            <div className="ai-section-heading">
              <div>
                <span className="detail-section-label">
                  VIZORA Intelligence
                </span>

                <span
                  className={
                    analysis
                      ? 'ai-status ai-status-complete'
                      : 'ai-status'
                  }
                >
                  {analysis
                    ? 'Analyzed'
                    : 'Not analyzed'}
                </span>
              </div>

              <button
                className="ai-analyze-button"
                type="button"
                disabled={isAnalyzing}
                onClick={() => {
                  void handleAnalyze()
                }}
              >
                {isAnalyzing
                  ? 'Analyzing...'
                  : analysis
                    ? 'Analyze again'
                    : 'Analyze image'}
              </button>
            </div>

            {analysisError && (
              <p className="ai-analysis-error">
                {analysisError}
              </p>
            )}

            {analysis ? (
              <AIAnalysisView
                analysis={analysis}
              />
            ) : (
              <div className="ai-analysis-placeholder">
                <div className="ai-placeholder-row">
                  <span>
                    Style
                  </span>

                  <div />
                </div>

                <div className="ai-placeholder-row">
                  <span>
                    Mood
                  </span>

                  <div />
                </div>

                <div className="ai-placeholder-row">
                  <span>
                    Lighting
                  </span>

                  <div />
                </div>

                <div className="ai-placeholder-row">
                  <span>
                    Composition
                  </span>

                  <div />
                </div>

                <p>
                  Analyze this reference to
                  generate visual intelligence.
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
  analysis: ImageAnalysis
}

function AIAnalysisView({
  analysis,
}: AIAnalysisViewProps) {
  return (
    <div className="ai-analysis-content">
      <p className="ai-analysis-summary">
        {analysis.summary}
      </p>

      <div className="ai-analysis-item">
        <span>
          Subject
        </span>

        <p>
          {analysis.subject}
        </p>
      </div>

      <div className="ai-analysis-item">
        <span>
          Style
        </span>

        <div className="ai-analysis-values">
          {analysis.style.map(
            (value) => (
              <span key={value}>
                {value}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="ai-analysis-item">
        <span>
          Mood
        </span>

        <div className="ai-analysis-values">
          {analysis.mood.map(
            (value) => (
              <span key={value}>
                {value}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="ai-analysis-item">
        <span>
          Lighting
        </span>

        <p>
          {analysis.lighting}
        </p>
      </div>

      <div className="ai-analysis-item">
        <span>
          Composition
        </span>

        <p>
          {analysis.composition}
        </p>
      </div>

      <div className="ai-analysis-item">
        <span>
          Color palette
        </span>

        <div className="ai-color-palette">
          {analysis.color_palette.map(
            (color) => (
              <div
                key={color}
                className="ai-color"
              >
                <span
                  className="ai-color-swatch"
                  style={{
                    backgroundColor: color,
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

      <div className="ai-analysis-item">
        <span>
          AI tags
        </span>

        <div className="ai-analysis-values">
          {analysis.tags.map(
            (tag) => (
              <span key={tag}>
                {tag}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="ai-analysis-item">
        <span>
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
  image: VisualReference,
) {
  if (image.width === image.height) {
    return 'Square'
  }

  return image.width > image.height
    ? 'Landscape'
    : 'Portrait'
}