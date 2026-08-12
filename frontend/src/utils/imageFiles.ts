import type { VisualReference } from '../types/image'

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

export const MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024

export function validateImageFile(file: File) {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, and WebP images are supported.'
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return 'Images must be smaller than 15 MB.'
  }

  return null
}

export function createVisualReferenceFromFile(
  file: File,
): Promise<VisualReference> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)

    const image = new Image()

    image.onload = () => {
      resolve({
        id: `upload-${crypto.randomUUID()}`,
        title: removeFileExtension(file.name),
        src: objectUrl,
        alt: file.name,
        tags: [
          'uploaded',
          getFileExtension(file.name),
        ].filter(Boolean),
        width: image.naturalWidth,
        height: image.naturalHeight,
        source: 'upload',
        fileName: file.name,
        fileSize: file.size,
      })
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)

      reject(
        new Error(`Unable to read ${file.name}`),
      )
    }

    image.src = objectUrl
  })
}

function removeFileExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '')
}

function getFileExtension(fileName: string) {
  const extension = fileName
    .split('.')
    .pop()
    ?.toLowerCase()

  return extension ?? ''
}