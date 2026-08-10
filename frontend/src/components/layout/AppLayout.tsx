import { useState } from 'react'

import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

import type { WorkspaceSection } from '../../types/navigation'

const sectionTitles: Record<WorkspaceSection, string> = {
  library: 'Library',
  boards: 'Boards',
  discover: 'Discover',
}

export function AppLayout() {
  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>('library')

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
  return (
    <>
      <section className="workspace-intro">
        <span className="eyebrow">
          Visual intelligence workspace
        </span>

        <h1>Your ideas, in one visual space.</h1>

        <p>
          Collect references, build visual boards, and eventually let AI
          help you understand and rediscover your creative library.
        </p>
      </section>

      <section
        className="empty-library"
        aria-label="Empty visual library"
      >
        <div className="empty-library-content">
          <div className="empty-library-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="3"
              />

              <circle cx="9" cy="10" r="2" />

              <path d="m5.5 17 4.5-4 3 2.5 2.5-2 3 3" />
            </svg>
          </div>

          <span className="empty-library-label">
            Your library
          </span>

          <h2>Your visual library starts here.</h2>

          <p>
            Images, boards, references, and AI insights will appear
            here as we continue building VIZORA.
          </p>
        </div>
      </section>
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
          <div className="section-placeholder-icon" aria-hidden="true">
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
          <div className="section-placeholder-icon" aria-hidden="true">
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