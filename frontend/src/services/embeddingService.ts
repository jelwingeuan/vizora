import {
  ApiError,
  apiRequest,
} from './api'

import type {
  CachedEmbeddingsResponse,
  ImageEmbedding,
} from '../types/embedding'

import type {
  VisualReference,
} from '../types/image'


export async function embedImage(
  image: VisualReference,
  signal?: AbortSignal,
): Promise<ImageEmbedding> {
  if (
    image.source ===
    'upload'
  ) {
    return retryAfterRateLimit(
      () => apiRequest<ImageEmbedding>(
        `/api/embeddings/image/${encodeURIComponent(image.id)}`,
        { method: 'POST', signal },
      ),
      signal,
    )
  }

  const response =
    await fetch(
      image.src,
      { signal },
    )

  if (
    !response.ok
  ) {
    throw new Error(
      'Unable to read the selected image.',
    )
  }

  const blob =
    await response.blob()

  const mimeType =
    blob.type
    || 'image/jpeg'

  const fileName =
    image.fileName
    ?? (
      `vizora-reference.${getExtension(
        mimeType,
      )}`
    )

  const file =
    new File(
      [blob],

      fileName,

      {
        type:
          mimeType,
      },
    )

  const formData =
    new FormData()

  formData.append(
    'image',
    file,
  )

  return retryAfterRateLimit(
    () => apiRequest<ImageEmbedding>(
      '/api/embeddings/image',
      { method: 'POST', body: formData, signal },
    ),
    signal,
  )
}


export function getCachedImageEmbeddings(
  imageIds: string[],
  signal?: AbortSignal,
): Promise<CachedEmbeddingsResponse> {
  return retryAfterRateLimit(
    () => apiRequest<CachedEmbeddingsResponse>(
      '/api/embeddings/cached',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_ids: imageIds }),
        signal,
      },
    ),
    signal,
  )
}


async function retryAfterRateLimit<T>(
  request: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  while (true) {
    throwIfAborted(signal)

    try {
      return await request()
    } catch (error) {
      if (
        !(error instanceof ApiError)
        || error.status !== 429
      ) {
        throw error
      }

      await waitForRetry(
        Math.max(1, error.retryAfterSeconds ?? 60),
        signal,
      )
    }
  }
}


function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException(
      'Comparison cancelled.',
      'AbortError',
    )
  }
}


function waitForRetry(
  seconds: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      throwIfAborted(signal)
    } catch (error) {
      reject(error)
      return
    }

    const onAbort = () => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
      reject(signal?.reason ?? new DOMException(
        'Comparison cancelled.',
        'AbortError',
      ))
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, seconds * 1000)

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}


function getExtension(
  mimeType: string,
) {
  switch (
    mimeType
  ) {
    case 'image/png':
      return 'png'

    case 'image/webp':
      return 'webp'

    case 'image/jpeg':
    default:
      return 'jpg'
  }
}