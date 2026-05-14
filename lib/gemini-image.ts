// Server-side only — do not import from 'use client' components; GOOGLE_AI_API_KEY would be exposed.

import { GoogleGenAI } from "@google/genai";

export interface ReferenceImage {
  mimeType: string;
  dataBase64: string; // base64 string without the "data:...;base64," prefix
}

export interface GenerateImageParams {
  prompt: string;
  referenceImages?: ReferenceImage[];
  count?: number;
}

export interface GenerateImageResult {
  images: string[];
}

const DEFAULT_IMAGE_MODELS = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.5-flash-image",
];

function resolveModels(): string[] {
  const env = process.env.GEMINI_IMAGE_MODEL?.trim();
  if (env)
    return env
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return DEFAULT_IMAGE_MODELS;
}

// Remembers the first successful model so subsequent calls skip the 404 fallback round-trip.
// Resets on process restart.
let preferredModel: string | null = null;
const DEFAULT_COUNT = 3;
const MAX_COUNT = 4;
// 100 ms stagger is enough for 3 concurrent calls without hitting Gemini RPM limits.
const STAGGER_MS = 100;
// 500 ms sleep on first failure/empty-response (includes safety blocks).
const RETRY_DELAY_MS = 500;
// TODO(PRD): fix output aspect ratio to 1:1 via config.imageConfig.aspectRatio once confirmed
//            supported by this SDK version. (Current model default is approximately square.)

type ContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} 가 .env.local 에 설정되지 않았어요.`);
  return v;
}

function buildContents(prompt: string, refs: ReferenceImage[]): ContentPart[] {
  const parts: ContentPart[] = [{ text: prompt }];
  for (const ref of refs) {
    if (ref?.mimeType && ref?.dataBase64) {
      parts.push({
        inlineData: { mimeType: ref.mimeType, data: ref.dataBase64 },
      });
    }
  }
  return parts;
}

// Returns DataURL on success, null if the response contains no image (text-only / safety block),
// or throws on a hard call failure (429/503/network etc.).
async function attemptGenerate(
  ai: GoogleGenAI,
  contents: ContentPart[],
): Promise<string | null> {
  const list = resolveModels();
  // Try the previously-successful model first to skip the 404 fallback round-trip.
  const ordered =
    preferredModel && list.includes(preferredModel)
      ? [preferredModel, ...list.filter((m) => m !== preferredModel)]
      : list;

  let lastErr: unknown;
  for (const model of ordered) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { responseModalities: ["image", "text"] },
      });
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        const inline = part.inlineData;
        if (inline?.data) {
          if (preferredModel !== model) preferredModel = model; // 첫 성공 모델 캐싱
          return `data:${inline.mimeType || "image/png"};base64,${inline.data}`;
        }
      }
      // Response arrived but contained no image — retrying on the same model beats alias fallback.
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[gemini-image] model ${model} 실패: ${msg}`);
      lastErr = err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("이미지 생성 호출에 실패했어요.");
}

// One slot = one output image. Retries once on failure/empty. On final failure, logs and returns
// null rather than throwing — so the other slots keep running.
async function generateSlot(
  ai: GoogleGenAI,
  contents: ContentPart[],
  slot: number,
): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const img = await attemptGenerate(ai, contents);
      if (img) return img;
      if (attempt === 1) {
        console.warn(
          `[gemini-image] slot ${slot}: 응답에 이미지가 없어요 (텍스트만/세이프티 차단 가능) — 재시도`,
        );
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.warn(
        `[gemini-image] slot ${slot}: 재시도해도 이미지가 없어요 — 이 슬롯 포기`,
      );
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 1) {
        console.warn(
          `[gemini-image] slot ${slot}: 1차 호출 실패 (${msg}) — 재시도`,
        );
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.warn(
        `[gemini-image] slot ${slot}: 재시도도 실패 (${msg}) — 이 슬롯 포기`,
      );
      return null;
    }
  }
  return null;
}

export const geminiImage = {
  get isConfigured() {
    return !!process.env.GOOGLE_AI_API_KEY;
  },

  async generate(params: GenerateImageParams): Promise<GenerateImageResult> {
    const prompt = params.prompt?.trim();
    if (!prompt) throw new Error("이미지 프롬프트가 비어 있어요.");

    const apiKey = requireEnv("GOOGLE_AI_API_KEY");
    const count = Math.max(
      1,
      Math.min(MAX_COUNT, params.count ?? DEFAULT_COUNT),
    );
    const refs = Array.isArray(params.referenceImages)
      ? params.referenceImages
      : [];

    const ai = new GoogleGenAI({ apiKey });
    const contents = buildContents(prompt, refs);

    const results = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        sleep(i * STAGGER_MS).then(() => generateSlot(ai, contents, i)),
      ),
    );

    const images = results.filter((v): v is string => !!v);
    if (images.length === 0) {
      throw new Error(
        "이미지가 생성되지 않았어요. 잠시 후 다시 시도해주세요. (자세한 사유는 서버 콘솔의 [gemini-image] 로그 확인)",
      );
    }
    return { images };
  },
};
