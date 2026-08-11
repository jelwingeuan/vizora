import { ImageCard } from './ImageCard'

import type { VisualReference } from '../../types/image'

type ImageGridProps = {
  images: VisualReference[]
}

export function ImageGrid({ images }: ImageGridProps) {
  return (
    <section
      className="image-grid"
      aria-label="Visual reference library"
    >
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
        />
      ))}
    </section>
  )
}