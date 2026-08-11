import { ImageCard } from './ImageCard'

import type { VisualReference } from '../../types/image'

type ImageGridProps = {
  images: VisualReference[]
  selectedImageId?: string
  onSelectImage: (image: VisualReference) => void
}

export function ImageGrid({
  images,
  selectedImageId,
  onSelectImage,
}: ImageGridProps) {
  return (
    <section
      className="image-grid"
      aria-label="Visual reference library"
    >
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          isSelected={selectedImageId === image.id}
          onSelect={onSelectImage}
        />
      ))}
    </section>
  )
}