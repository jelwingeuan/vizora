import {
  afterEach,
  expect,
  it,
  vi,
} from 'vitest'

import {
  setAccessToken,
} from './api'

import {
  embedImage,
  getCachedImageEmbeddings,
} from './embeddingService'

import type {
  VisualReference,
} from '../types/image'


const uploadedImage: VisualReference = {
  id: 'image-123',
  title: 'Reference',
  src: '/api/images/image-123/file',
  alt: 'Reference',
  tags: [],
  width: 1,
  height: 1,
  source: 'upload',
  isFavorite: false,
  createdAt: null,
}


function jsonResponse(body: object, status = 200, retryAfter?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(retryAfter ? { 'Retry-After': retryAfter } : {}),
    },
  })
}


afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.sessionStorage.clear()
})


it('loads cached vectors in one authenticated batch', async () => {
  setAccessToken('owner-token')
  const embedding = {
    embedding: [1, 0],
    dimensions: 2,
    model: 'test-model',
  }
  const fetchMock = vi.fn().mockResolvedValue(
    jsonResponse({ embeddings: { 'image-123': embedding } }),
  )
  vi.stubGlobal('fetch', fetchMock)

  await expect(getCachedImageEmbeddings(['image-123']))
    .resolves.toEqual({ embeddings: { 'image-123': embedding } })

  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
  expect(url).toContain('/api/embeddings/cached')
  expect(options.method).toBe('POST')
  expect(new Headers(options.headers).get('X-Vizora-Token'))
    .toBe('owner-token')
  expect(JSON.parse(options.body as string))
    .toEqual({ image_ids: ['image-123'] })
})


it('retries only after the server Retry-After delay', async () => {
  vi.useFakeTimers()
  const embedding = {
    embedding: [1, 0],
    dimensions: 2,
    model: 'test-model',
  }
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(jsonResponse({ detail: 'Try later.' }, 429, '2'))
    .mockResolvedValueOnce(jsonResponse(embedding))
  vi.stubGlobal('fetch', fetchMock)

  const result = embedImage(uploadedImage)
  await vi.advanceTimersByTimeAsync(0)
  expect(fetchMock).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(1999)
  expect(fetchMock).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(1)
  await expect(result).resolves.toEqual(embedding)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})


it('cancels a rate-limit wait without sending another request', async () => {
  vi.useFakeTimers()
  const controller = new AbortController()
  const fetchMock = vi.fn()
    .mockResolvedValue(jsonResponse({ detail: 'Try later.' }, 429, '60'))
  vi.stubGlobal('fetch', fetchMock)

  const result = embedImage(uploadedImage, controller.signal)
  await vi.advanceTimersByTimeAsync(0)
  controller.abort()

  await expect(result).rejects.toMatchObject({ name: 'AbortError' })
  await vi.advanceTimersByTimeAsync(60_000)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})


it('does not retry provider errors', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    jsonResponse({ detail: 'Provider unavailable.' }, 502),
  )
  vi.stubGlobal('fetch', fetchMock)

  await expect(embedImage(uploadedImage))
    .rejects.toMatchObject({ status: 502 })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
