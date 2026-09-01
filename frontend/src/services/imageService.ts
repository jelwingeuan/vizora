import {
  apiRequest,
} from './api'

import type {
  ImageAnalysis,
} from '../types/analysis'

import type {
  VisualReference,
} from '../types/image'


type StoredImageResponse = {
  id: string

  title: string

  url: string

  original_filename:
    string

  file_size:
    number

  width:
    number

  height:
    number

  source:
    'upload'

  is_favorite:
    boolean

  created_at:
    string

  analysis:
    ImageAnalysis | null
}


type ImageFavoriteResponse = {
  id: string

  is_favorite:
    boolean
}


type ImageTitleResponse = {
  id: string

  title: string
}


export type StoredImageRecord = {
  image:
    VisualReference

  analysis:
    ImageAnalysis | null
}


export async function getImages():
Promise<StoredImageRecord[]> {
  const response =
    await apiRequest<
      StoredImageResponse[]
    >(
      '/api/images',
    )

  return response.map(
    (
      image,
    ) => ({
      image:
        createVisualReference(
          image,
        ),

      analysis:
        image.analysis,
    }),
  )
}


export async function uploadImages(
  files: File[],
): Promise<
  VisualReference[]
> {
  if (
    files.length === 0
  ) {
    return []
  }

  const formData =
    new FormData()

  files.forEach(
    (file) => {
      formData.append(
        'images',
        file,
      )
    },
  )

  const response =
    await apiRequest<
      StoredImageResponse[]
    >(
      '/api/images',

      {
        method:
          'POST',

        body:
          formData,
      },
    )

  return response.map(
    createVisualReference,
  )
}


export async function renameImage(
  imageId: string,

  title: string,
): Promise<string> {
  const response =
    await apiRequest<
      ImageTitleResponse
    >(
      `/api/images/${
        encodeURIComponent(
          imageId,
        )
      }`,

      {
        method:
          'PATCH',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            title,
          }),
      },
    )

  return response.title
}


export async function deleteImage(
  imageId: string,
): Promise<void> {
  await apiRequest<void>(
    `/api/images/${
      encodeURIComponent(
        imageId,
      )
    }`,

    {
      method:
        'DELETE',
    },
  )
}


export async function setImageFavorite(
  imageId: string,

  isFavorite: boolean,
): Promise<boolean> {
  const response =
    await apiRequest<
      ImageFavoriteResponse
    >(
      `/api/images/${
        encodeURIComponent(
          imageId,
        )
      }/favorite`,

      {
        method:
          'PATCH',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            is_favorite:
              isFavorite,
          }),
      },
    )

  return response.is_favorite
}


function createVisualReference(
  image:
    StoredImageResponse,
): VisualReference {
  const extension =
    getFileExtension(
      image.original_filename,
    )

  return {
    id:
      image.id,

    title:
      image.title,

    src:
      image.url,

    alt:
      image.original_filename,

    tags: [
      'uploaded',
      extension,
    ].filter(
      Boolean,
    ),

    width:
      image.width,

    height:
      image.height,

    source:
      image.source,

    isFavorite:
      image.is_favorite,

    createdAt:
      image.created_at,

    fileName:
      image.original_filename,

    fileSize:
      image.file_size,
  }
}


function getFileExtension(
  fileName: string,
) {
  const extension =
    fileName
      .split('.')
      .pop()
      ?.toLowerCase()

  return (
    extension
    ?? ''
  )
}