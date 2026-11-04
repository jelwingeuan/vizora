import {
  render,
  screen,
} from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import {
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  VisualReference,
} from '../../types/image'


const services = vi.hoisted(() => ({
  getHealth: vi.fn(),
  getImages: vi.fn(),
  findSimilarImages: vi.fn(),
}))


vi.mock('../../services/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/api')>(),
  getHealth: services.getHealth,
}))

vi.mock('../../services/imageService', () => ({
  getImages: services.getImages,
  deleteImage: vi.fn(),
  renameImage: vi.fn(),
  setImageFavorite: vi.fn(),
  uploadImages: vi.fn(),
}))

vi.mock('../../services/searchService', () => ({
  findSimilarImages: services.findSimilarImages,
  semanticSearch: vi.fn(),
}))

vi.mock('../gallery/ImageGrid', () => ({
  ImageGrid: ({
    images,
    onSelectImage,
  }: {
    images: VisualReference[]
    onSelectImage: (image: VisualReference) => void
  }) => (
    <button type="button" onClick={() => onSelectImage(images[0])}>
      Open reference
    </button>
  ),
}))

vi.mock('../gallery/ImageDetailPanel', () => ({
  ImageDetailPanel: ({
    image,
    onFindSimilar,
  }: {
    image: VisualReference
    onFindSimilar: (image: VisualReference) => Promise<void>
  }) => (
    <button type="button" onClick={() => { void onFindSimilar(image) }}>
      Find similar now
    </button>
  ),
}))

import {
  AppLayout,
} from './AppLayout'


function makeImage(index: number): VisualReference {
  return {
    id: `image-${index}`,
    title: `Reference ${index}`,
    src: `/api/images/image-${index}/file`,
    alt: `Reference ${index}`,
    tags: [],
    width: 1,
    height: 1,
    isFavorite: false,
    createdAt: null,
  }
}


beforeEach(() => {
  vi.clearAllMocks()
  services.getHealth.mockResolvedValue({ status: 'ok' })
})


it('compares a reference with one backend request', async () => {
  const images = [makeImage(0), makeImage(1)]

  services.getImages.mockResolvedValue(
    images.map((image) => ({ image, analysis: null })),
  )

  services.findSimilarImages.mockResolvedValue({
    results: [{ id: 'image-1', score: 0.9 }],
  })

  const user = userEvent.setup()
  render(<AppLayout />)

  await user.click(await screen.findByRole('button', {
    name: 'Open reference',
  }))

  await user.click(screen.getByRole('button', {
    name: 'Find similar now',
  }))

  await screen.findByText(/Visually similar to/)

  expect(services.findSimilarImages).toHaveBeenCalledOnce()
  expect(services.findSimilarImages).toHaveBeenCalledWith(
    'image-0',
    undefined,
  )
})
