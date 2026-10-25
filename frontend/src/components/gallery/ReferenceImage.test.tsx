import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'

import {
  afterEach,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import {
  ReferenceImage,
} from './ReferenceImage'

import {
  DiscoverWorkspace,
} from '../discover/DiscoverWorkspace'

import type {
  VisualReference,
} from '../../types/image'


const NativeURL = URL


// Keep the real URL constructor so origin
// checks still work while blob URLs are mocked.
function stubBlobUrls(
  methods: {
    createObjectURL: (blob: Blob) => string
    revokeObjectURL: (url: string) => void
  },
) {
  vi.stubGlobal(
    'URL',
    Object.assign(
      class extends NativeURL {},
      methods,
    ),
  )
}


const uploadedImage: VisualReference = {
  id: 'image-123',
  title: 'Uploaded image',
  src: 'http://127.0.0.1:8000/api/images/image-123/file',
  alt: 'Uploaded image',
  tags: ['uploaded'],
  width: 8,
  height: 6,
  source: 'upload',
  isFavorite: false,
  createdAt: '2026-09-06T10:00:00Z',
}


beforeEach(() => {
  window.sessionStorage.clear()
})


afterEach(() => {
  vi.unstubAllGlobals()
})


it('loads uploads with the owner header and revokes replaced and unmounted blob URLs', async () => {
  window.sessionStorage.setItem(
    'vizora.accessToken',
    'owner-token',
  )

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['image'], { type: 'image/png' }),
  })

  const createObjectURL = vi.fn()
    .mockReturnValueOnce('blob:first')
    .mockReturnValueOnce('blob:second')

  const revokeObjectURL = vi.fn()

  vi.stubGlobal('fetch', fetchMock)
  stubBlobUrls({
    createObjectURL,
    revokeObjectURL,
  })

  const { rerender, unmount } = render(
    <ReferenceImage
      image={uploadedImage}
      alt={uploadedImage.alt}
    />,
  )

  await waitFor(() => {
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:first')
  })

  const firstOptions = fetchMock.mock.calls[0][1] as RequestInit

  expect(fetchMock.mock.calls[0][0]).toBe(uploadedImage.src)
  expect(new Headers(firstOptions.headers).get('X-Vizora-Token')).toBe('owner-token')

  rerender(
    <ReferenceImage
      image={{ ...uploadedImage, src: '/api/images/second/file' }}
      alt={uploadedImage.alt}
    />,
  )

  await waitFor(() => {
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:second')
  })

  expect(revokeObjectURL).toHaveBeenCalledWith('blob:first')

  unmount()

  expect(revokeObjectURL).toHaveBeenCalledWith('blob:second')
})


it('never sends the owner header to another origin', async () => {
  window.sessionStorage.setItem(
    'vizora.accessToken',
    'owner-token',
  )

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['image'], { type: 'image/png' }),
  })

  vi.stubGlobal('fetch', fetchMock)
  stubBlobUrls({
    createObjectURL: vi.fn().mockReturnValue('blob:foreign'),
    revokeObjectURL: vi.fn(),
  })

  render(
    <ReferenceImage
      image={{
        ...uploadedImage,
        src: 'https://attacker.example/api/images/image-123/file',
      }}
      alt={uploadedImage.alt}
    />,
  )

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  const options = fetchMock.mock.calls[0][1] as RequestInit

  expect(new Headers(options.headers).has('X-Vizora-Token')).toBe(false)
})


it('displays demo images without an authenticated fetch', () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  render(
    <ReferenceImage
      image={{
        ...uploadedImage,
        source: 'mock',
        src: 'https://picsum.photos/demo',
      }}
      alt="Demo image"
    />,
  )

  expect(screen.getByRole('img')).toHaveAttribute(
    'src',
    'https://picsum.photos/demo',
  )
  expect(fetchMock).not.toHaveBeenCalled()
})


it('displays uploaded Discover results and their detail preview', async () => {
  window.sessionStorage.setItem(
    'vizora.accessToken',
    'owner-token',
  )

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['image'], { type: 'image/png' }),
  })

  vi.stubGlobal('fetch', fetchMock)
  stubBlobUrls({
    createObjectURL: vi.fn().mockReturnValue('blob:discover'),
    revokeObjectURL: vi.fn(),
  })

  render(
    <DiscoverWorkspace
      images={[uploadedImage]}
      imageAnalyses={{}}
      onDiscover={vi.fn().mockResolvedValue([uploadedImage.id])}
      onAnalyzeImage={vi.fn()}
      onFindSimilar={vi.fn()}
    />,
  )

  fireEvent.change(
    screen.getByRole('searchbox', { name: 'Discover visual references' }),
    { target: { value: 'uploaded' } },
  )
  fireEvent.click(screen.getByRole('button', { name: 'Explore' }))

  const results = await screen.findByRole(
    'region',
    { name: 'Discovered visual references' },
  )

  await waitFor(() => {
    expect(results.getElementsByTagName('img')[0]).toHaveAttribute(
      'src',
      'blob:discover',
    )
  })

  fireEvent.click(screen.getByRole('button', { name: 'Open Uploaded image' }))

  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: 'Uploaded image' })
      .getElementsByTagName('img')[0]).toHaveAttribute('src', 'blob:discover')
  })

  expect(fetchMock).toHaveBeenCalledTimes(2)
})
