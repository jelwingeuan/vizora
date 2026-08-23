import {
  apiRequest,
} from './api'

import type {
  ImageEmbedding,
} from '../types/embedding'

import type {
  VisualReference,
} from '../types/image'


export async function embedImage(
  image: VisualReference,
): Promise<ImageEmbedding> {
  if (
    image.source ===
    'upload'
  ) {
    return apiRequest<
      ImageEmbedding
    >(
      `/api/embeddings/image/${
        encodeURIComponent(
          image.id,
        )
      }`,

      {
        method: 'POST',
      },
    )
  }

  const response =
    await fetch(
      image.src,
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

  return apiRequest<
    ImageEmbedding
  >(
    '/api/embeddings/image',

    {
      method:
        'POST',

      body:
        formData,
    },
  )
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