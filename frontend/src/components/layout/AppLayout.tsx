import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { ImageDetailPanel } from '../gallery/ImageDetailPanel'
import { ImageGrid } from '../gallery/ImageGrid'
import { ImageDropzone } from '../upload/ImageDropzone'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

import { mockImages } from '../../data/mockImages'

import { getHealth } from '../../services/api'

import {
  createVisualReferenceFromFile,
} from '../../utils/imageFiles'

import type { BackendConnectionStatus } from '../../types/api'
import type { VisualReference } from '../../types/image'
import type { WorkspaceSection } from '../../types/navigation'

const sectionTitles: Record<WorkspaceSection, string> = {
  library: 'Library',
  boards: 'Boards',
  discover: 'Discover',
}

export function AppLayout() {
  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>('library')

  const [backendStatus, setBackendStatus] =
    useState<BackendConnectionStatus>('checking')

  useEffect(() => {
    let isCancelled = false

    async function checkBackend() {
      try {
        const health = await getHealth()

        if (isCancelled) {
          return
        }

        setBackendStatus(
          health.status === 'ok'
            ? 'connected'
            : 'offline',
        )
      } catch {
        if (!isCancelled) {
          setBackendStatus('offline')
        }
      }
    }

    void checkBackend()

    return () => {
      isCancelled = true
    }
  }, [])

  function renderWorkspace() {
    switch (activeSection) {
      case 'boards':
        return <BoardsWorkspace />

      case 'discover':
        return <DiscoverWorkspace />

      case 'library':
      default:
        return <LibraryWorkspace />
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeSection={activeSection}
        backendStatus={backendStatus}
        onNavigate={setActiveSection}
      />

      <div className="app-main">
        <TopBar title={sectionTitles[activeSection]} />

        <main className="workspace">
          {renderWorkspace()}
        </main>
      </div>
    </div>
  )
}

function LibraryWorkspace() {
  const [selectedImage, setSelectedImage] =
    useState<VisualReference | null>(null)

  const [uploadedImages, setUploadedImages] =
    useState<VisualReference[]>([])

  const objectUrlsRef =
    useRef<string[]>([])

  const images = [
    ...uploadedImages,
    ...mockImages,
  ]

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(
        (objectUrl) => {
          URL.revokeObjectURL(objectUrl)
        },
      )
    }
  }, [])

  async function handleUploadFiles(
    files: File[],
  ) {
    const results = await Promise.allSettled(
      files.map(
        createVisualReferenceFromFile,
      ),
    )

    const newImages = results
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<VisualReference> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value)

    if (newImages.length === 0) {
      return
    }

    objectUrlsRef.current.push(
      ...newImages.map((image) => image.src),
    )

    setUploadedImages((currentImages) => [
      ...newImages,
      ...currentImages,
    ])
  }

  return (
    <>
      <section className="library-header">
        <div>
          <span className="eyebrow">
            Visual intelligence workspace
          </span>

          <h1>Library</h1>

          <p>
            A visual collection of references,
            ideas, moods, and creative directions.
          </p>
        </div>

        <div className="library-header-meta">
          <span>
            {images.length} references
          </span>
        </div>
      </section>

      <div className="library-toolbar">
        <div className="library-filter-group">
          <button
            className="filter-chip filter-chip-active"
            type="button"
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
        onFilesSelected={handleUploadFiles}
      />

      <ImageGrid
        images={images}
        selectedImageId={selectedImage?.id}
        onSelectImage={setSelectedImage}
      />

      {selectedImage && (
        <ImageDetailPanel
          image={selectedImage}
          onClose={() =>
            setSelectedImage(null)
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

        <h1>Shape references into boards.</h1>

        <p>
          Boards will let you group images and ideas around projects,
          styles, characters, environments, and creative directions.
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

          <h2>No boards yet.</h2>

          <p>
            Your project boards will live here once board creation is
            added to VIZORA.
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

        <h1>Rediscover what inspires you.</h1>

        <p>
          Discover will eventually use visual intelligence and semantic
          search to surface useful references from your library.
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

          <h2>Discovery is coming.</h2>

          <p>
            Semantic search, visual similarity, and AI-assisted
            discovery will appear here later.
          </p>
        </div>
      </section>
    </>
  )
}