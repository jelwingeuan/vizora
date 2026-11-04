import {
  render,
  screen,
  waitFor,
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
  getCachedImageEmbeddings: vi.fn(),
  embedImage: vi.fn(),
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

vi.mock('../../services/embeddingService', () => ({
  getCachedImageEmbeddings: services.getCachedImageEmbeddings,
  embedImage: services.embedImage,
}))

vi.mock('../../data/mockImages', () => ({ mockImages: [] }))

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
    source: 'upload',
    isFavorite: false,
    createdAt: null,
  }
}


beforeEach(() => {
  vi.clearAllMocks()
  services.getHealth.mockResolvedValue({ status: 'ok' })
  services.embedImage.mockRejectedValue(new Error('Unexpected provider call'))
})


it('prefills 501 stored vectors in bounded batches before comparing', async () => {
  const images: VisualReference[] = Array.from(
    { length: 501 },
    (_, index) => makeImage(index),
  )

  services.getImages.mockResolvedValue(
    images.map((image) => ({ image, analysis: null })),
  )

  services.getCachedImageEmbeddings.mockImplementation(
    async (imageIds: string[]) => ({
      embeddings: Object.fromEntries(
        imageIds.map((id) => [
          id,
          { embedding: [1, 0], dimensions: 2, model: 'test-model' },
        ]),
      ),
    }),
  )

  const user = userEvent.setup()
  render(<AppLayout />)

  await user.click(await screen.findByRole('button', {
    name: 'Open reference',
  }))

  await user.click(screen.getByRole('button', {
    name: 'Find similar now',
  }))

  await screen.findByText(/Visually similar to/)

  await waitFor(() => {
    expect(services.getCachedImageEmbeddings).toHaveBeenCalledTimes(6)
    expect(services.embedImage).not.toHaveBeenCalled()
  })

  expect(
    services.getCachedImageEmbeddings.mock.calls.map(
      ([imageIds]) => imageIds.length,
    ),
  ).toEqual([100, 100, 100, 100, 100, 1])
})


it('generates only the stored vectors absent from the batch', async () => {
  const images = [makeImage(0), makeImage(1)]
  services.getImages.mockResolvedValue(
    images.map((image) => ({ image, analysis: null })),
  )
  services.getCachedImageEmbeddings.mockResolvedValue({
    embeddings: {
      'image-0': {
        embedding: [1, 0],
        dimensions: 2,
        model: 'test-model',
      },
    },
  })
  services.embedImage.mockResolvedValue({
    embedding: [1, 0],
    dimensions: 2,
    model: 'test-model',
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
  expect(services.getCachedImageEmbeddings).toHaveBeenCalledTimes(1)
  expect(services.embedImage).toHaveBeenCalledOnce()
  expect(services.embedImage).toHaveBeenCalledWith(images[1], undefined)
})
