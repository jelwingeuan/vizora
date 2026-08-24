import {
  useState,
  type FormEvent,
} from 'react'

import {
  ImageDetailPanel,
} from '../gallery/ImageDetailPanel'

import {
  ImageGrid,
} from '../gallery/ImageGrid'

import type {
  ImageAnalysis,
} from '../../types/analysis'

import type {
  VisualReference,
} from '../../types/image'

import './DiscoverWorkspace.css'


const DISCOVERY_DIRECTIONS = [
  {
    label: 'Cinematic',
    query: (
      'cinematic landscape lighting atmosphere'
    ),
  },

  {
    label: 'Minimal',
    query: (
      'minimal architecture clean form'
    ),
  },

  {
    label: 'Atmospheric',
    query: (
      'night atmosphere mood color'
    ),
  },

  {
    label: 'Organic',
    query: (
      'nature organic palette texture'
    ),
  },

  {
    label: 'Editorial',
    query: (
      'editorial layout composition rhythm'
    ),
  },

  {
    label: 'Character',
    query: (
      'character portrait mood photography'
    ),
  },
] as const


const IGNORED_CONCEPTS =
  new Set([
    'uploaded',
    'jpg',
    'jpeg',
    'png',
    'webp',
  ])


type DiscoverWorkspaceProps = {
  images:
    VisualReference[]

  imageAnalyses:
    Record<
      string,
      ImageAnalysis
    >

  onDiscover: (
    query: string,
  ) => Promise<
    string[]
  >

  onAnalyzeImage: (
    image:
      VisualReference,
  ) => Promise<void>

  onFindSimilar: (
    image:
      VisualReference,
  ) => Promise<void>
}


export function DiscoverWorkspace({
  images,
  imageAnalyses,
  onDiscover,
  onAnalyzeImage,
  onFindSimilar,
}: DiscoverWorkspaceProps) {
  const [
    query,
    setQuery,
  ] =
    useState('')

  const [
    activeQuery,
    setActiveQuery,
  ] =
    useState<
      string | null
    >(null)

  const [
    resultIds,
    setResultIds,
  ] =
    useState<
      string[] | null
    >(null)

  const [
    isDiscovering,
    setIsDiscovering,
  ] =
    useState(false)

  const [
    discoveryError,
    setDiscoveryError,
  ] =
    useState<
      string | null
    >(null)

  const [
    selectedImage,
    setSelectedImage,
  ] =
    useState<
      VisualReference
      | null
    >(null)


  const analyzedCount =
    images.reduce(
      (
        count,
        image,
      ) =>
        count
        +
        (
          imageAnalyses[
            image.id
          ]
            ? 1
            : 0
        ),

      0,
    )


  const uploadedCount =
    images.filter(
      (image) =>
        image.source
        === 'upload',
    ).length


  const generatedTagCount =
    new Set(
      images.flatMap(
        (image) =>
          imageAnalyses[
            image.id
          ]?.tags
          ?? [],
      ),
    ).size


  const suggestedConcepts =
    getSuggestedConcepts(
      images,
    )


  const resultImages =
    resultIds
      ? resultIds
          .map(
            (id) =>
              images.find(
                (image) =>
                  image.id
                  === id,
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
      : []


  const selectedImageWithLatestData =
    selectedImage
      ? (
          images.find(
            (image) =>
              image.id
              ===
              selectedImage.id,
          )
          ?? selectedImage
        )
      : null


  async function runDiscovery(
    nextQuery: string,
  ) {
    const normalizedQuery =
      nextQuery.trim()

    if (
      !normalizedQuery
      || isDiscovering
    ) {
      return
    }

    setQuery(
      nextQuery,
    )

    setIsDiscovering(
      true,
    )

    setDiscoveryError(
      null,
    )

    setSelectedImage(
      null,
    )

    try {
      const ids =
        await onDiscover(
          normalizedQuery,
        )

      setResultIds(
        ids,
      )

      setActiveQuery(
        normalizedQuery,
      )
    } catch (error) {
      setDiscoveryError(
        error instanceof Error
          ? error.message
          : (
              'Unable to discover references.'
            ),
      )
    } finally {
      setIsDiscovering(
        false,
      )
    }
  }


  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    void runDiscovery(
      query,
    )
  }


  function handleClear() {
    setQuery(
      '',
    )

    setActiveQuery(
      null,
    )

    setResultIds(
      null,
    )

    setDiscoveryError(
      null,
    )

    setSelectedImage(
      null,
    )
  }


  return (
    <div className="discover-workspace">
      <section className="discover-header">
        <div>
          <span className="eyebrow">
            Visual discovery
          </span>

          <h1>
            Discover
          </h1>

          <p>
            Explore your references by mood,
            style, subject, lighting,
            composition, or creative
            direction.
          </p>
        </div>

        <div className="discover-header-meta">
          <span>
            {images.length}
            {' '}
            references available
          </span>
        </div>
      </section>


      <section className="discover-hero">
        <div className="discover-hero-copy">
          <span className="discover-hero-label">
            Semantic discovery
          </span>

          <h2>
            Describe what you want to see.
          </h2>

          <p>
            VIZORA searches the visual
            meaning, metadata, tags, and
            analyzed creative qualities
            across your reference library.
          </p>
        </div>

        <form
          className="discover-search-form"
          onSubmit={
            handleSubmit
          }
        >
          <input
            className="discover-search-input"
            type="search"
            value={
              query
            }
            disabled={
              isDiscovering
            }
            placeholder="e.g. warm cinematic forest with soft lighting"
            aria-label="Discover visual references"
            onChange={
              (event) =>
                setQuery(
                  event.target.value,
                )
            }
          />

          <button
            className="discover-search-button"
            type="submit"
            disabled={
              isDiscovering
              || !query.trim()
            }
          >
            {isDiscovering
              ? 'Exploring...'
              : 'Explore'}
          </button>
        </form>


        <div className="discover-directions">
          <span className="discover-group-label">
            Explore a direction
          </span>

          <div className="discover-chip-list">
            {DISCOVERY_DIRECTIONS.map(
              (direction) => (
                <button
                  key={
                    direction.label
                  }
                  className="discover-chip"
                  type="button"
                  disabled={
                    isDiscovering
                  }
                  onClick={() => {
                    void runDiscovery(
                      direction.query,
                    )
                  }}
                >
                  {direction.label}
                </button>
              ),
            )}
          </div>
        </div>


        {suggestedConcepts.length > 0 && (
          <div className="discover-directions">
            <span className="discover-group-label">
              From your library
            </span>

            <div className="discover-chip-list">
              {suggestedConcepts.map(
                (concept) => (
                  <button
                    key={
                      concept
                    }
                    className={
                      'discover-chip '
                      + 'discover-chip-library'
                    }
                    type="button"
                    disabled={
                      isDiscovering
                    }
                    onClick={() => {
                      void runDiscovery(
                        concept,
                      )
                    }}
                  >
                    {concept}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </section>


      <section
        className="discover-stats"
        aria-label="Library intelligence"
      >
        <div className="discover-stat-card">
          <span>
            References
          </span>

          <strong>
            {images.length}
          </strong>

          <small>
            Available for discovery
          </small>
        </div>

        <div className="discover-stat-card">
          <span>
            Uploaded
          </span>

          <strong>
            {uploadedCount}
          </strong>

          <small>
            Persistent references
          </small>
        </div>

        <div className="discover-stat-card">
          <span>
            Analyzed
          </span>

          <strong>
            {analyzedCount}
          </strong>

          <small>
            Enriched with visual intelligence
          </small>
        </div>

        <div className="discover-stat-card">
          <span>
            Concepts
          </span>

          <strong>
            {generatedTagCount}
          </strong>

          <small>
            Generated searchable tags
          </small>
        </div>
      </section>


      {discoveryError && (
        <p
          className="discover-error"
          role="alert"
        >
          {discoveryError}
        </p>
      )}


      <section className="discover-results-section">
        <header className="discover-results-header">
          <div>
            <span className="discover-group-label">
              Discovery results
            </span>

            <h2>
              {resultIds === null
                ? 'Ready to explore'
                : resultImages.length > 0
                  ? (
                      `Found ${resultImages.length} strong ${
                        resultImages.length === 1
                          ? 'match'
                          : 'matches'
                      }`
                    )
                  : 'No strong matches'}
            </h2>

            <p>
              {resultIds === null
                ? (
                    'Choose a direction or describe a visual idea to begin.'
                  )
                : resultImages.length > 0
                  ? (
                      `Results for “${activeQuery}” are ranked by semantic relevance.`
                    )
                  : (
                      `Nothing in the current library strongly matches “${activeQuery}”. Try a broader direction or analyze more references.`
                    )}
            </p>
          </div>

          {resultIds !== null && (
            <button
              className="discover-clear-button"
              type="button"
              onClick={
                handleClear
              }
            >
              Clear
            </button>
          )}
        </header>


        {resultIds === null ? (
          <div className="discover-start-state">
            <div
              className="discover-start-icon"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24">
                <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />

                <path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
              </svg>
            </div>

            <span className="empty-library-label">
              Discovery ready
            </span>

            <h3>
              Follow an idea, not a filename.
            </h3>

            <p>
              Search for feelings, visual
              styles, lighting, environments,
              materials, subjects, or
              composition ideas.
            </p>
          </div>
        ) : resultImages.length > 0 ? (
          <div className="discover-results-grid">
            <ImageGrid
              images={
                resultImages
              }
              selectedImageId={
                selectedImage?.id
              }
              ariaLabel={
                'Discovered visual references'
              }
              onSelectImage={
                setSelectedImage
              }
            />
          </div>
        ) : (
          <div className="discover-start-state">
            <div
              className="discover-start-icon"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24">
                <circle
                  cx="11"
                  cy="11"
                  r="6"
                />

                <path d="m16 16 4 4" />

                <path d="M8.5 11h5" />
              </svg>
            </div>

            <span className="empty-library-label">
              No strong match
            </span>

            <h3>
              Try widening the direction.
            </h3>

            <p>
              Shorter searches such as
              “cinematic”, “organic”, or
              “soft lighting” may reveal
              more useful references.
            </p>
          </div>
        )}
      </section>


      {selectedImageWithLatestData && (
        <ImageDetailPanel
          image={
            selectedImageWithLatestData
          }
          analysis={
            imageAnalyses[
              selectedImageWithLatestData.id
            ]
          }
          onAnalyze={
            onAnalyzeImage
          }
          onFindSimilar={
            onFindSimilar
          }
          onClose={() =>
            setSelectedImage(
              null,
            )
          }
        />
      )}
    </div>
  )
}


function getSuggestedConcepts(
  images:
    VisualReference[],
) {
  const counts =
    new Map<
      string,
      number
    >()


  images.forEach(
    (image) => {
      image.tags.forEach(
        (tag) => {
          const normalizedTag =
            tag
              .trim()
              .toLowerCase()

          if (
            !normalizedTag
            || IGNORED_CONCEPTS.has(
              normalizedTag,
            )
          ) {
            return
          }

          counts.set(
            normalizedTag,

            (
              counts.get(
                normalizedTag,
              )
              ?? 0
            )
            + 1,
          )
        },
      )
    },
  )


  return [
    ...counts.entries(),
  ]
    .sort(
      (
        first,
        second,
      ) =>
        (
          second[1]
          - first[1]
        )
        ||
        first[0]
          .localeCompare(
            second[0],
          ),
    )
    .slice(
      0,
      10,
    )
    .map(
      ([concept]) =>
        concept,
    )
}