import {
  apiRequest,
} from './api'

import type {
  ImageAnalysis,
} from '../types/analysis'

import type {
  VisualReference,
} from '../types/image'


export async function analyzeImage(
  image: VisualReference,
): Promise<ImageAnalysis> {
  if (
    image.source ===
    'upload'
  ) {
    return apiRequest<
      ImageAnalysis
    >(
      `/api/ai/analyze/${
        encodeURIComponent(
          image.id,
        )
      }`,

      {
        method:
          'POST',
      },
    )
  }

  const imageResponse =
    await fetch(
      image.src,
    )

  if (
    !imageResponse.ok
  ) {
    throw new Error(
      'Unable to read the selected image.',
    )
  }

  const blob =
    await imageResponse.blob()

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
      [
        blob,
      ],

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
    ImageAnalysis
  >(
    '/api/ai/analyze',

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