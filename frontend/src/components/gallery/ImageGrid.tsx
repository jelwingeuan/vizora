import {
  ImageCard,
} from './ImageCard'

import type {
  VisualReference,
} from '../../types/image'


type ImageGridProps = {
  images:
    VisualReference[]

  selectedImageId?:
    string

  ariaLabel?:
    string

  onSelectImage: (
    image:
      VisualReference,
  ) => void

  onRenameImage?: (
    image:
      VisualReference,

    title:
      string,
  ) => Promise<void>

  onDeleteImage?: (
    image:
      VisualReference,
  ) => Promise<void>
}


export function ImageGrid({
  images,
  selectedImageId,
  ariaLabel = (
    'Visual reference library'
  ),
  onSelectImage,
  onRenameImage,
  onDeleteImage,
}: ImageGridProps) {
  return (
    <section
      className="image-grid"
      aria-label={
        ariaLabel
      }
    >
      {images.map(
        (image) => (
          <ImageCard
            key={
              image.id
            }

            image={
              image
            }

            isSelected={
              selectedImageId
              === image.id
            }

            onSelect={
              onSelectImage
            }

            onRename={
              onRenameImage
            }

            onDelete={
              onDeleteImage
            }
          />
        ),
      )}
    </section>
  )
}