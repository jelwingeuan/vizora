import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  BoardsWorkspace,
} from '../boards/BoardsWorkspace'

import {
  DiscoverWorkspace,
} from '../discover/DiscoverWorkspace'

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
  deleteImage,
  getImages,
  renameImage,
  setImageFavorite,
  uploadImages,
} from '../../services/imageService'

import {
  semanticSearch,
} from '../../services/searchService'

import {
  rankSimilarImages,
} from '../../utils/similarity'

import type {
  SimilarityCandidate,
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
  library:
    'Library',

  boards:
    'Boards',

  discover:
    'Discover',
}


const SIMILARITY_EMBEDDING_BATCH_SIZE =
  4


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
    let isCancelled =
      false

    async function initializeBackend() {
      try {
        const health =
          await getHealth()

        if (
          isCancelled
        ) {
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

        if (
          isCancelled
        ) {
          return
        }

        const savedImages =
          savedRecords.map(
            (
              record,
            ) =>
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
      isCancelled =
        true
    }
  }, [])


  async function handleUploadFiles(
    files:
      File[],
  ) {
    const newImages =
      await uploadImages(
        files,
      )

    if (
      newImages.length ===
      0
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
              (
                image,
              ) =>
                image.id,
            ),
          )

        const uniqueNewImages =
          newImages.filter(
            (
              image,
            ) =>
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
    image:
      VisualReference,
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


  async function handleSetFavorite(
    image:
      VisualReference,

    isFavorite:
      boolean,
  ) {
    if (
      image.source !==
      'upload'
    ) {
      return
    }

    const persistedValue =
      await setImageFavorite(
        image.id,
        isFavorite,
      )

    setUploadedImages(
      (
        currentImages,
      ) =>
        currentImages.map(
          (
            currentImage,
          ) =>
            currentImage.id
            === image.id
              ? {
                  ...currentImage,

                  isFavorite:
                    persistedValue,
                }
              : currentImage,
        ),
    )
  }


  async function handleRenameImage(
    image:
      VisualReference,

    title:
      string,
  ) {
    if (
      image.source !==
      'upload'
    ) {
      return
    }

    const persistedTitle =
      await renameImage(
        image.id,
        title,
      )

    setUploadedImages(
      (
        currentImages,
      ) =>
        currentImages.map(
          (
            currentImage,
          ) =>
            currentImage.id
            === image.id
              ? {
                  ...currentImage,

                  title:
                    persistedTitle,
                }
              : currentImage,
        ),
    )

    handleClearDiscovery()
  }


  async function handleDeleteImage(
    image:
      VisualReference,
  ) {
    if (
      image.source !==
      'upload'
    ) {
      return
    }

    await deleteImage(
      image.id,
    )

    setUploadedImages(
      (
        currentImages,
      ) =>
        currentImages.filter(
          (
            currentImage,
          ) =>
            currentImage.id
            !== image.id,
        ),
    )

    setImageAnalyses(
      (
        currentAnalyses,
      ) => {
        const nextAnalyses = {
          ...currentAnalyses,
        }

        delete nextAnalyses[
          image.id
        ]

        return nextAnalyses
      },
    )

    delete (
      imageEmbeddingCacheRef
        .current[
        image.id
      ]
    )

    handleClearDiscovery()
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
      images.length ===
      0
    ) {
      return
    }

    const items =
      createSemanticSearchItems(
        images,
        imageAnalyses,
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
          (
            result,
          ) =>
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
          : (
              'Unable to search references.'
            ),
      )

    } finally {
      setIsSearching(
        false,
      )
    }
  }


  async function handleDiscoverSearch(
    query:
      string,
  ): Promise<
    string[]
  > {
    const normalizedQuery =
      query.trim()

    if (
      !normalizedQuery
    ) {
      return []
    }

    const images = [
      ...uploadedImages,
      ...mockImages,
    ]

    if (
      images.length ===
      0
    ) {
      return []
    }

    const items =
      createSemanticSearchItems(
        images,
        imageAnalyses,
      )

    const response =
      await semanticSearch(
        normalizedQuery,
        items,
      )

    return response.results.map(
      (
        result,
      ) =>
        result.id,
    )
  }


  async function getImageEmbedding(
    image:
      VisualReference,
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


  async function getCandidateEmbeddings(
    candidates:
      VisualReference[],
  ): Promise<
    SimilarityCandidate[]
  > {
    const embeddedCandidates:
      SimilarityCandidate[] = []


    for (
      let index = 0;
      index < candidates.length;
      index +=
        SIMILARITY_EMBEDDING_BATCH_SIZE
    ) {
      const batch =
        candidates.slice(
          index,

          index
          +
          SIMILARITY_EMBEDDING_BATCH_SIZE,
        )


      const batchResults =
        await Promise.allSettled(
          batch.map(
            async (
              candidate,
            ) => ({
              id:
                candidate.id,

              embedding:
                await getImageEmbedding(
                  candidate,
                ),
            }),
          ),
        )


      batchResults.forEach(
        (
          result,
        ) => {
          if (
            result.status ===
            'fulfilled'
          ) {
            embeddedCandidates.push(
              result.value,
            )
          }
        },
      )
    }


    return (
      embeddedCandidates
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
        (
          image,
        ) =>
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

    const embeddedCandidates =
      await getCandidateEmbeddings(
        candidates,
      )

    if (
      embeddedCandidates.length ===
      0
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
    query:
      string,
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
          <DiscoverWorkspace
            images={
              [
                ...uploadedImages,
                ...mockImages,
              ].map(
                (
                  image,
                ) =>
                  applyAnalysisTags(
                    image,

                    imageAnalyses[
                      image.id
                    ]?.tags,
                  ),
              )
            }

            imageAnalyses={
              imageAnalyses
            }

            onDiscover={
              handleDiscoverSearch
            }

            onAnalyzeImage={
              handleAnalyzeImage
            }

            onFindSimilar={
              handleFindSimilar
            }
          />
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

            onSetFavorite={
              handleSetFavorite
            }

            onRenameImage={
              handleRenameImage
            }

            onDeleteImage={
              handleDeleteImage
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


type LibraryFilter =
  | 'all'
  | 'recent'
  | 'favorites'


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
    files:
      File[],
  ) => Promise<void>

  onAnalyzeImage: (
    image:
      VisualReference,
  ) => Promise<void>

  onFindSimilar: (
    image:
      VisualReference,
  ) => Promise<void>

  onSetFavorite: (
    image:
      VisualReference,

    isFavorite:
      boolean,
  ) => Promise<void>

  onRenameImage: (
    image:
      VisualReference,

    title:
      string,
  ) => Promise<void>

  onDeleteImage: (
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
  onSetFavorite,
  onRenameImage,
  onDeleteImage,
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

  const [
    libraryFilter,
    setLibraryFilter,
  ] =
    useState<
      LibraryFilter
    >('all')


  const baseImages = [
    ...uploadedImages,
    ...mockImages,
  ]

  const images =
    baseImages.map(
      (
        image,
      ) =>
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


  const recentImages =
    [...uploadedImages]
      .filter(
        (
          image,
        ) =>
          Boolean(
            image.createdAt,
          ),
      )
      .sort(
        (
          first,
          second,
        ) =>
          getTimestamp(
            second.createdAt,
          )
          -
          getTimestamp(
            first.createdAt,
          ),
      )


  const favoriteImages =
    uploadedImages.filter(
      (
        image,
      ) =>
        image.isFavorite,
    )


  const filteredImages =
    libraryFilter ===
    'recent'
      ? recentImages
      : libraryFilter ===
        'favorites'
        ? favoriteImages
        : images


  const visibleImages =
    activeResultIds
      ? activeResultIds
          .map(
            (
              id,
            ) =>
              images.find(
                (
                  image,
                ) =>
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
      : filteredImages


  const selectedImageWithTags =
    selectedImage
      ? applyAnalysisTags(
          baseImages.find(
            (
              image,
            ) =>
              image.id
              === selectedImage.id,
          )
          ?? selectedImage,

          imageAnalyses[
            selectedImage.id
          ]?.tags,
        )
      : null


  function selectLibraryFilter(
    filter:
      LibraryFilter,
  ) {
    onClearDiscovery()

    setLibraryFilter(
      filter,
    )
  }


  async function handleLibraryDelete(
    image:
      VisualReference,
  ) {
    await onDeleteImage(
      image,
    )

    if (
      selectedImage?.id
      === image.id
    ) {
      setSelectedImage(
        null,
      )
    }
  }


  const libraryDescription =
    similarImageIds !==
    null
      ? (
          `Visually similar to “${similarSourceTitle}”.`
        )
      : searchResultIds !==
        null
        ? (
            `Semantic results for “${searchQuery}”.`
          )
        : libraryFilter ===
          'recent'
          ? (
              'Your persisted references ordered from newest to oldest.'
            )
          : libraryFilter ===
            'favorites'
            ? (
                'References you have saved as favorites.'
              )
            : (
                'A visual collection of references, ideas, moods, and creative directions.'
              )


  const resultLabel =
    similarImageIds !==
    null
      ? 'similar references'
      : searchResultIds !==
        null
        ? 'results'
        : libraryFilter ===
          'recent'
          ? 'recent references'
          : libraryFilter ===
            'favorites'
            ? 'favorites'
            : 'references'


  const emptyState =
    getLibraryEmptyState(
      similarImageIds,
      searchResultIds,
      libraryFilter,
    )


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
            {libraryDescription}
          </p>
        </div>

        <div className="library-header-meta">
          <span>
            {visibleImages.length}
            {' '}
            {resultLabel}
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
                && libraryFilter
                === 'all'
                  ? 'filter-chip-active'
                  : ''
              }`
            }

            type="button"

            onClick={() =>
              selectLibraryFilter(
                'all',
              )
            }
          >
            All
          </button>

          <button
            className={
              `filter-chip ${
                !activeResultIds
                && libraryFilter
                === 'recent'
                  ? 'filter-chip-active'
                  : ''
              }`
            }

            type="button"

            onClick={() =>
              selectLibraryFilter(
                'recent',
              )
            }
          >
            Recent
          </button>

          <button
            className={
              `filter-chip ${
                !activeResultIds
                && libraryFilter
                === 'favorites'
                  ? 'filter-chip-active'
                  : ''
              }`
            }

            type="button"

            onClick={() =>
              selectLibraryFilter(
                'favorites',
              )
            }
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


      {visibleImages.length > 0 ? (
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

          onRenameImage={
            onRenameImage
          }

          onDeleteImage={
            handleLibraryDelete
          }
        />
      ) : (
        <section
          className="section-placeholder"
          aria-label={
            emptyState.label
          }
        >
          <div className="section-placeholder-content">
            <span className="empty-library-label">
              {emptyState.label}
            </span>

            <h2>
              {emptyState.title}
            </h2>

            <p>
              {emptyState.description}
            </p>
          </div>
        </section>
      )}


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

          onSetFavorite={
            onSetFavorite
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


function createSemanticSearchItems(
  images:
    VisualReference[],

  imageAnalyses:
    Record<
      string,
      ImageAnalysis
    >,
): SemanticSearchItem[] {
  return images.map(
    (
      image,
    ) => ({
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


function getTimestamp(
  value:
    string | null,
) {
  if (!value) {
    return 0
  }

  const timestamp =
    new Date(
      value,
    ).getTime()

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return 0
  }

  return timestamp
}


function getLibraryEmptyState(
  similarImageIds:
    | string[]
    | null,

  searchResultIds:
    | string[]
    | null,

  libraryFilter:
    LibraryFilter,
) {
  if (
    similarImageIds !==
    null
  ) {
    return {
      label:
        'Similarity',

      title:
        'No close visual matches found.',

      description:
        (
          'Try another reference or add more '
          + 'images to your library.'
        ),
    }
  }


  if (
    searchResultIds !==
    null
  ) {
    return {
      label:
        'Search',

      title:
        'No matching references found.',

      description:
        (
          'Try a broader search or analyze '
          + 'more references first.'
        ),
    }
  }


  if (
    libraryFilter ===
    'favorites'
  ) {
    return {
      label:
        'Favorites',

      title:
        'No favorites yet.',

      description:
        (
          'Open an uploaded reference and '
          + 'add it to your favorites.'
        ),
    }
  }


  if (
    libraryFilter ===
    'recent'
  ) {
    return {
      label:
        'Recent',

      title:
        'No recent uploads yet.',

      description:
        (
          'Upload a reference to begin '
          + 'building your recent collection.'
        ),
    }
  }


  return {
    label:
      'Library',

    title:
      'No references yet.',

    description:
      'Upload an image to begin your library.',
  }
}