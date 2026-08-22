import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  ImageDetailPanel,
} from '../gallery/ImageDetailPanel'

import {
  ImageGrid,
} from '../gallery/ImageGrid'

import {
  ImageDropzone,
} from '../upload/ImageDropzone'

import {
  Sidebar,
} from './Sidebar'

import {
  TopBar,
} from './TopBar'

import {
  mockImages,
} from '../../data/mockImages'

import {
  analyzeImage,
} from '../../services/aiService'

import {
  getHealth,
} from '../../services/api'

import {
  embedImage,
} from '../../services/embeddingService'

import {
  getImages,
  uploadImages,
} from '../../services/imageService'

import {
  semanticSearch,
} from '../../services/searchService'

import {
  rankSimilarImages,
} from '../../utils/similarity'

import {
  mergeImageTags,
} from '../../utils/tags'

import type {
  ImageAnalysis,
} from '../../types/analysis'

import type {
  BackendConnectionStatus,
} from '../../types/api'

import type {
  VisualReference,
} from '../../types/image'

import type {
  WorkspaceSection,
} from '../../types/navigation'

import type {
  SemanticSearchItem,
} from '../../types/search'


const sectionTitles:
Record<
  WorkspaceSection,
  string
> = {
  library: 'Library',
  boards: 'Boards',
  discover: 'Discover',
}


export function AppLayout() {
  const [
    activeSection,
    setActiveSection,
  ] =
    useState<WorkspaceSection>(
      'library',
    )

  const [
    backendStatus,
    setBackendStatus,
  ] =
    useState<
      BackendConnectionStatus
    >(
      'checking',
    )

  const [
    uploadedImages,
    setUploadedImages,
  ] =
    useState<
      VisualReference[]
    >([])

  const [
    imageAnalyses,
    setImageAnalyses,
  ] =
    useState<
      Record<
        string,
        ImageAnalysis
      >
    >({})

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState('')

  const [
    searchResultIds,
    setSearchResultIds,
  ] =
    useState<
      string[] | null
    >(null)

  const [
    isSearching,
    setIsSearching,
  ] =
    useState(false)

  const [
    searchError,
    setSearchError,
  ] =
    useState<
      string | null
    >(null)

  const [
    similarImageIds,
    setSimilarImageIds,
  ] =
    useState<
      string[] | null
    >(null)

  const [
    similarSourceTitle,
    setSimilarSourceTitle,
  ] =
    useState<
      string | null
    >(null)

  const imageEmbeddingCacheRef =
    useRef<
      Record<
        string,
        number[]
      >
    >({})


  useEffect(() => {
    let isCancelled = false

    async function initializeBackend() {
      try {
        const health =
          await getHealth()

        if (isCancelled) {
          return
        }

        if (
          health.status !==
          'ok'
        ) {
          setBackendStatus(
            'offline',
          )

          return
        }

        const savedRecords =
          await getImages()

        if (isCancelled) {
          return
        }

        const savedImages =
          savedRecords.map(
            (record) =>
              record.image,
          )

        const savedAnalyses =
          savedRecords.reduce<
            Record<
              string,
              ImageAnalysis
            >
          >(
            (
              analyses,
              record,
            ) => {
              if (
                record.analysis
              ) {
                analyses[
                  record.image.id
                ] =
                  record.analysis
              }

              return analyses
            },

            {},
          )

        setUploadedImages(
          savedImages,
        )

        setImageAnalyses(
          savedAnalyses,
        )

        setBackendStatus(
          'connected',
        )
      } catch {
        if (
          !isCancelled
        ) {
          setBackendStatus(
            'offline',
          )
        }
      }
    }

    void initializeBackend()

    return () => {
      isCancelled = true
    }
  }, [])


  async function handleUploadFiles(
    files: File[],
  ) {
    const newImages =
      await uploadImages(
        files,
      )

    if (
      newImages.length === 0
    ) {
      return
    }

    setUploadedImages(
      (
        currentImages,
      ) => {
        const currentIds =
          new Set(
            currentImages.map(
              (image) =>
                image.id,
            ),
          )

        const uniqueNewImages =
          newImages.filter(
            (image) =>
              !currentIds.has(
                image.id,
              ),
          )

        return [
          ...uniqueNewImages,
          ...currentImages,
        ]
      },
    )

    clearDiscoveryResults()
  }


  async function handleAnalyzeImage(
    image: VisualReference,
  ) {
    const analysis =
      await analyzeImage(
        image,
      )

    setImageAnalyses(
      (
        currentAnalyses,
      ) => ({
        ...currentAnalyses,

        [image.id]:
          analysis,
      }),
    )

    clearDiscoveryResults()
  }


  async function handleSemanticSearch() {
    const query =
      searchQuery.trim()

    if (!query) {
      setSearchResultIds(
        null,
      )

      setSearchError(
        null,
      )

      return
    }

    const images = [
      ...uploadedImages,
      ...mockImages,
    ]

    if (
      images.length === 0
    ) {
      return
    }

    const items:
      SemanticSearchItem[] =
      images.map(
        (image) => ({
          id:
            image.id,

          title:
            image.title,

          text:
            buildSearchText(
              image,

              imageAnalyses[
                image.id
              ],
            ),
        }),
      )

    setSimilarImageIds(
      null,
    )

    setSimilarSourceTitle(
      null,
    )

    setIsSearching(
      true,
    )

    setSearchError(
      null,
    )

    try {
      const response =
        await semanticSearch(
          query,
          items,
        )

      setSearchResultIds(
        response.results.map(
          (result) =>
            result.id,
        ),
      )

      setActiveSection(
        'library',
      )
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : 'Unable to search references.',
      )
    } finally {
      setIsSearching(
        false,
      )
    }
  }


  async function getImageEmbedding(
    image: VisualReference,
  ) {
    const cachedEmbedding =
      imageEmbeddingCacheRef
        .current[
        image.id
      ]

    if (
      cachedEmbedding
    ) {
      return (
        cachedEmbedding
      )
    }

    const response =
      await embedImage(
        image,
      )

    imageEmbeddingCacheRef
      .current[
      image.id
    ] =
      response.embedding

    return (
      response.embedding
    )
  }


  async function handleFindSimilar(
    sourceImage:
      VisualReference,
  ) {
    const images = [
      ...uploadedImages,
      ...mockImages,
    ]

    const candidates =
      images.filter(
        (image) =>
          image.id !==
          sourceImage.id,
      )

    if (
      candidates.length ===
      0
    ) {
      throw new Error(
        'There are no other references to compare.',
      )
    }

    const sourceEmbedding =
      await getImageEmbedding(
        sourceImage,
      )

    const embeddedCandidates: {
      id: string
      embedding: number[]
    }[] = []

    for (
      const candidate
      of candidates
    ) {
      try {
        const embedding =
          await getImageEmbedding(
            candidate,
          )

        embeddedCandidates.push(
          {
            id:
              candidate.id,

            embedding,
          },
        )
      } catch {
        // Skip images that cannot
        // currently be embedded.
      }
    }

    if (
      embeddedCandidates.length
      === 0
    ) {
      throw new Error(
        'Unable to generate comparison embeddings.',
      )
    }

    const rankedImageIds =
      rankSimilarImages(
        sourceEmbedding,
        embeddedCandidates,
      )

    setSimilarImageIds(
      rankedImageIds,
    )

    setSimilarSourceTitle(
      sourceImage.title,
    )

    setSearchResultIds(
      null,
    )

    setSearchQuery(
      '',
    )

    setSearchError(
      null,
    )

    setActiveSection(
      'library',
    )
  }


  function handleSearchQueryChange(
    query: string,
  ) {
    setSearchQuery(
      query,
    )

    if (
      !query.trim()
    ) {
      setSearchResultIds(
        null,
      )

      setSearchError(
        null,
      )
    }
  }


  function clearDiscoveryResults() {
    setSearchResultIds(
      null,
    )

    setSimilarImageIds(
      null,
    )

    setSimilarSourceTitle(
      null,
    )

    setSearchError(
      null,
    )
  }


  function handleClearDiscovery() {
    clearDiscoveryResults()

    setSearchQuery(
      '',
    )
  }


  function renderWorkspace() {
    switch (
      activeSection
    ) {
      case 'boards':
        return (
          <BoardsWorkspace />
        )

      case 'discover':
        return (
          <DiscoverWorkspace />
        )

      case 'library':
      default:
        return (
          <LibraryWorkspace
            uploadedImages={
              uploadedImages
            }
            imageAnalyses={
              imageAnalyses
            }
            searchResultIds={
              searchResultIds
            }
            searchQuery={
              searchQuery
            }
            searchError={
              searchError
            }
            similarImageIds={
              similarImageIds
            }
            similarSourceTitle={
              similarSourceTitle
            }
            onUploadFiles={
              handleUploadFiles
            }
            onAnalyzeImage={
              handleAnalyzeImage
            }
            onFindSimilar={
              handleFindSimilar
            }
            onClearDiscovery={
              handleClearDiscovery
            }
          />
        )
    }
  }


  return (
    <div className="app-shell">
      <Sidebar
        activeSection={
          activeSection
        }
        backendStatus={
          backendStatus
        }
        onNavigate={
          setActiveSection
        }
      />

      <div className="app-main">
        <TopBar
          title={
            sectionTitles[
              activeSection
            ]
          }
          searchQuery={
            searchQuery
          }
          isSearching={
            isSearching
          }
          onSearchQueryChange={
            handleSearchQueryChange
          }
          onSearch={
            handleSemanticSearch
          }
        />

        <main className="workspace">
          {renderWorkspace()}
        </main>
      </div>
    </div>
  )
}


type LibraryWorkspaceProps = {
  uploadedImages:
    VisualReference[]

  imageAnalyses:
    Record<
      string,
      ImageAnalysis
    >

  searchResultIds:
    | string[]
    | null

  searchQuery:
    string

  searchError:
    | string
    | null

  similarImageIds:
    | string[]
    | null

  similarSourceTitle:
    | string
    | null

  onUploadFiles: (
    files: File[],
  ) => Promise<void>

  onAnalyzeImage: (
    image:
      VisualReference,
  ) => Promise<void>

  onFindSimilar: (
    image:
      VisualReference,
  ) => Promise<void>

  onClearDiscovery:
    () => void
}


function LibraryWorkspace({
  uploadedImages,
  imageAnalyses,
  searchResultIds,
  searchQuery,
  searchError,
  similarImageIds,
  similarSourceTitle,
  onUploadFiles,
  onAnalyzeImage,
  onFindSimilar,
  onClearDiscovery,
}: LibraryWorkspaceProps) {
  const [
    selectedImage,
    setSelectedImage,
  ] =
    useState<
      VisualReference
      | null
    >(null)

  const baseImages = [
    ...uploadedImages,
    ...mockImages,
  ]

  const images =
    baseImages.map(
      (image) =>
        applyAnalysisTags(
          image,

          imageAnalyses[
            image.id
          ]?.tags,
        ),
    )

  const activeResultIds =
    similarImageIds
    ?? searchResultIds

  const visibleImages =
    activeResultIds
      ? activeResultIds
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
      : images

  const selectedImageWithTags =
    selectedImage
      ? applyAnalysisTags(
          baseImages.find(
            (image) =>
              image.id
              ===
              selectedImage.id,
          )
          ?? selectedImage,

          imageAnalyses[
            selectedImage.id
          ]?.tags,
        )
      : null


  return (
    <>
      <section className="library-header">
        <div>
          <span className="eyebrow">
            Visual intelligence workspace
          </span>

          <h1>
            Library
          </h1>

          <p>
            {similarImageIds
              ? (
                  `Visually similar to “${similarSourceTitle}”.`
                )
              : searchResultIds
                ? (
                    `Semantic results for “${searchQuery}”.`
                  )
                : (
                    'A visual collection of references, ideas, moods, and creative directions.'
                  )}
          </p>
        </div>

        <div className="library-header-meta">
          <span>
            {visibleImages.length}
            {' '}

            {similarImageIds
              ? 'similar references'
              : searchResultIds
                ? 'results'
                : 'references'}
          </span>
        </div>
      </section>

      {searchError && (
        <p
          className="semantic-search-error"
          role="alert"
        >
          {searchError}
        </p>
      )}

      <div className="library-toolbar">
        <div className="library-filter-group">
          <button
            className={
              `filter-chip ${
                !activeResultIds
                  ? 'filter-chip-active'
                  : ''
              }`
            }
            type="button"
            onClick={
              onClearDiscovery
            }
          >
            All
          </button>

          <button
            className="filter-chip"
            type="button"
          >
            Recent
          </button>

          <button
            className="filter-chip"
            type="button"
          >
            Favorites
          </button>
        </div>

        <button
          className="gallery-view-button"
          type="button"
          aria-label="Gallery view"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="3"
              width="7"
              height="7"
              rx="1.5"
            />

            <rect
              x="14"
              y="3"
              width="7"
              height="7"
              rx="1.5"
            />

            <rect
              x="3"
              y="14"
              width="7"
              height="7"
              rx="1.5"
            />

            <rect
              x="14"
              y="14"
              width="7"
              height="7"
              rx="1.5"
            />
          </svg>
        </button>
      </div>

      <ImageDropzone
        onFilesSelected={
          onUploadFiles
        }
      />

      <ImageGrid
        images={
          visibleImages
        }
        selectedImageId={
          selectedImage?.id
        }
        onSelectImage={
          setSelectedImage
        }
      />

      {selectedImageWithTags && (
        <ImageDetailPanel
          image={
            selectedImageWithTags
          }
          analysis={
            imageAnalyses[
              selectedImageWithTags.id
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
    </>
  )
}


function BoardsWorkspace() {
  return (
    <>
      <section className="workspace-intro">
        <span className="eyebrow">
          Organize your inspiration
        </span>

        <h1>
          Shape references into boards.
        </h1>

        <p>
          Boards will let you group images
          and ideas around projects, styles,
          characters, environments, and
          creative directions.
        </p>
      </section>

      <section
        className="section-placeholder"
        aria-label="Boards workspace"
      >
        <div className="section-placeholder-content">
          <div
            className="section-placeholder-icon"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h4l2 2h5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
            </svg>
          </div>

          <span className="empty-library-label">
            Boards
          </span>

          <h2>
            No boards yet.
          </h2>

          <p>
            Your project boards will live
            here once board creation is added
            to VIZORA.
          </p>
        </div>
      </section>
    </>
  )
}


function DiscoverWorkspace() {
  return (
    <>
      <section className="workspace-intro">
        <span className="eyebrow">
          AI-powered discovery
        </span>

        <h1>
          Rediscover what inspires you.
        </h1>

        <p>
          Discover will eventually use visual
          intelligence and semantic search to
          surface useful references from your
          library.
        </p>
      </section>

      <section
        className="section-placeholder"
        aria-label="Discover workspace"
      >
        <div className="section-placeholder-content">
          <div
            className="section-placeholder-icon"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />

              <path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
            </svg>
          </div>

          <span className="empty-library-label">
            Discover
          </span>

          <h2>
            Discovery is coming.
          </h2>

          <p>
            Semantic search, visual similarity,
            and AI-assisted discovery will
            appear here later.
          </p>
        </div>
      </section>
    </>
  )
}


function applyAnalysisTags(
  image:
    VisualReference,

  generatedTags:
    string[] = [],
): VisualReference {
  return {
    ...image,

    tags:
      mergeImageTags(
        generatedTags,
        image.tags,
      ),
  }
}


function buildSearchText(
  image:
    VisualReference,

  analysis?:
    ImageAnalysis,
) {
  const sections = [
    `Tags: ${image.tags.join(', ')}`,
  ]

  if (analysis) {
    sections.push(
      `Summary: ${analysis.summary}`,

      `Subject: ${analysis.subject}`,

      `Style: ${analysis.style.join(', ')}`,

      `Mood: ${analysis.mood.join(', ')}`,

      `Lighting: ${analysis.lighting}`,

      `Composition: ${analysis.composition}`,

      `AI tags: ${analysis.tags.join(', ')}`,

      `Creative notes: ${analysis.creative_notes}`,
    )
  }

  return sections.join(
    '\n',
  )
}