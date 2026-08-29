export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]


export const MAX_IMAGE_FILE_SIZE =
  15 * 1024 * 1024


export function validateImageFile(
  file: File,
) {
  if (
    !SUPPORTED_IMAGE_TYPES.includes(
      file.type,
    )
  ) {
    return (
      'Only JPG, PNG, and WebP '
      + 'images are supported.'
    )
  }

  if (
    file.size
    > MAX_IMAGE_FILE_SIZE
  ) {
    return (
      'Images must be smaller '
      + 'than 15 MB.'
    )
  }

  return null
}