import type { VisualReference } from '../../types/image'

type ImageCardProps = {
  image: VisualReference
  isSelected: boolean
  onSelect: (image: VisualReference) => void
}

export function ImageCard({
  image,
  isSelected,
  onSelect,
}: ImageCardProps) {
  return (
    <article
      className={`image-card ${
        isSelected ? 'image-card-selected' : ''
      }`}
    >
      <div
        className="image-card-media"
        style={{
          aspectRatio: `${image.width} / ${image.height}`,
        }}
      >
        <button
          className="image-card-select"
          type="button"
          onClick={() => onSelect(image)}
          aria-label={`Open ${image.title}`}
        >
          <img
            src={image.src}
            alt={image.alt}
            loading="lazy"
          />
        </button>

        <div className="image-card-overlay">
          <button
            className="image-card-action"
            type="button"
            aria-label={`More options for ${image.title}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="1.3" />
              <circle cx="12" cy="12" r="1.3" />
              <circle cx="19" cy="12" r="1.3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="image-card-info">
        <h3>{image.title}</h3>

        <div className="image-card-tags">
          {image.tags.slice(0, 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </article>
  )
}