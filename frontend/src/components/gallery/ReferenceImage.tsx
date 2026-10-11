import {
  useEffect,
  useState,
} from 'react'

import {
  fetchWithAccess,
} from '../../services/api'

import type {
  VisualReference,
} from '../../types/image'


type ReferenceImageProps = {
  image: VisualReference
  alt: string
  loading?: 'eager' | 'lazy'
}


export function ReferenceImage({
  image,
  alt,
  loading,
}: ReferenceImageProps) {
  const [loaded, setLoaded] = useState<{
    source: string
    url: string
    signal: AbortSignal
  } | null>(null)

  useEffect(() => {
    if (image.source !== 'upload') {
      return
    }

    const controller = new AbortController()
    let objectUrl: string | undefined

    void (async () => {
      try {
        const response = await fetchWithAccess(
          image.src,
          {
            headers: {
              Accept: 'image/*',
            },
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          return
        }

        const blob = await response.blob()

        if (controller.signal.aborted) {
          return
        }

        objectUrl = URL.createObjectURL(blob)
        setLoaded({
          source: image.src,
          url: objectUrl,
          signal: controller.signal,
        })
      } catch {
        // Leave the image empty when loading fails.
      }
    })()

    return () => {
      controller.abort()

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [image.source, image.src])

  const src = image.source === 'mock'
    ? image.src
    : loaded?.source === image.src && !loaded.signal.aborted
      ? loaded.url
      : undefined

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
    />
  )
}
