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
