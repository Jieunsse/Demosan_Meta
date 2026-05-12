import { useApiMutation } from './useApiMutation'
import type { GenerateImageParams, GenerateImageResult, ReferenceImage } from '@/lib/gemini-image'

export type { GenerateImageParams, GenerateImageResult, ReferenceImage }

export function useGenerateImage() {
  return useApiMutation<GenerateImageParams, GenerateImageResult>('/api/generate-image')
}
