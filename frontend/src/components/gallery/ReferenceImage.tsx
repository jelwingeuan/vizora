import {
  useEffect,
  useRef,
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
  const imageRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState<{
    source: string
    url: string
    signal: AbortSignal
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | undefined
    let observer: IntersectionObserver | undefined
    let hasStarted = false

    async function loadImage() {
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
    }

    if (
      loading === 'lazy'
      && typeof IntersectionObserver !== 'undefined'
      && imageRef.current
    ) {
      observer = new IntersectionObserver(
        (entries) => {
          if (
            !hasStarted
            && !controller.signal.aborted
            && entries.some((entry) => entry.isIntersecting)
          ) {
            hasStarted = true
            observer?.disconnect()
            void loadImage()
          }
        },
        { rootMargin: '200px' },
      )
      observer.observe(imageRef.current)
    } else {
      void loadImage()
    }

    return () => {
      observer?.disconnect()
      controller.abort()

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [image.src, loading])

  const src = loaded?.source === image.src && !loaded.signal.aborted
    ? loaded.url
    : undefined

  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      loading={loading}
    />
  )
}
