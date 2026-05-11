import { useApiMutation } from './useApiMutation'
import type { GenerateCreativeParams, GenerateCreativeResult } from '@/lib/gemini-creative'

export type { GenerateCreativeParams, GenerateCreativeResult }

export function useGenerateCreative() {
  return useApiMutation<GenerateCreativeParams, GenerateCreativeResult>('/api/generate-creative')
}
