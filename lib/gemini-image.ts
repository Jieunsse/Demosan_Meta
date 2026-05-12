// Gemini Image 모듈 (Server-side 전용)
// 'use client' 컴포넌트에서 import 금지 — GOOGLE_AI_API_KEY 가 노출돼요.
// gemini-creative.ts 와 동일 패턴: Port 인터페이스 + HttpAdapter
// 모델: gemini-2.5-flash-image ("Nano Banana") — 텍스트→이미지 + 레퍼런스 이미지 입력 둘 다 지원

import { GoogleGenAI } from "@google/genai";

/* ── Types (Port interface) ─────────────────────────────────────── */

// 클라이언트가 첨부한 "원하는 결과물에 가까운 예시" 이미지 (DataURL 의 base64 부분)
export interface ReferenceImage {
  mimeType: string;   // "image/jpeg" 등
  dataBase64: string; // base64 문자열 ("data:...;base64," prefix 없이)
}

export interface GenerateImageParams {
  prompt: string;
  referenceImages?: ReferenceImage[]; // PRD: 권장 2~3장 (없어도 됨)
  count?: number;                     // 생성할 장수 (기본 3 — PRD 1라운드 3장)
}

export interface GenerateImageResult {
  // 각 항목 = "data:image/png;base64,..." DataURL — 브라우저에서 <img src> 로 바로 사용
  images: string[];
}

/* ── Internal ───────────────────────────────────────────────────── */

// 안정적으로 사용 가능한 Gemini 이미지 생성 모델 순으로 정렬.
// gemini-2.0-flash-preview-image-generation: 대부분의 AI Studio API 키에서 접근 가능.
// gemini-2.5-flash-image: 일부 preview 등록 키에서만 접근 가능 (폴백용).
const IMAGE_MODELS = ["gemini-2.0-flash-preview-image-generation", "gemini-2.5-flash-image"];
const DEFAULT_COUNT = 3;
const MAX_COUNT = 4;
const STAGGER_MS = 600;      // 3장을 동시에 폭발시키지 않고 슬롯마다 시작을 늦춤 (레이트 리밋 완화)
const RETRY_DELAY_MS = 1500; // 한 슬롯이 실패/빈응답이면 이만큼 쉬고 1회 재시도
// TODO(PRD): 출력 비율 1:1 고정 — config.imageConfig.aspectRatio 가 이 SDK 버전에서
//            지원되는지 확인 후 추가. (현재는 모델 기본 출력 = 정사각에 가까움)

type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };

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
      parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.dataBase64 } });
    }
  }
  return parts;
}

// 한 번의 생성 호출 (모델 폴백 포함).
//  - 성공: DataURL 문자열
//  - 응답은 왔지만 이미지가 없음(텍스트만/세이프티 차단 등): null
//  - 호출 자체 실패(429/503/네트워크 등): throw
async function attemptGenerate(ai: GoogleGenAI, contents: ContentPart[]): Promise<string | null> {
  let lastErr: unknown;
  for (const model of IMAGE_MODELS) {
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
          return `data:${inline.mimeType || "image/png"};base64,${inline.data}`;
        }
      }
      return null; // 응답 O / 이미지 X — 같은 모델 재시도가 alias 폴백보다 나아서 폴백 안 함
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[gemini-image] model ${model} 실패: ${msg}`);
      lastErr = err; // → 다음 모델로 폴백
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("이미지 생성 호출에 실패했어요.");
}

// 한 슬롯(= 결과 1장): 시도 → 실패/빈응답이면 1회 재시도. 끝까지 안 되면
// 사유를 서버 콘솔에 남기고 null 반환 (throw 안 함 — 나머지 슬롯은 계속 진행).
async function generateSlot(ai: GoogleGenAI, contents: ContentPart[], slot: number): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const img = await attemptGenerate(ai, contents);
      if (img) return img;
      if (attempt === 1) {
        console.warn(`[gemini-image] slot ${slot}: 응답에 이미지가 없어요 (텍스트만/세이프티 차단 가능) — 재시도`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.warn(`[gemini-image] slot ${slot}: 재시도해도 이미지가 없어요 — 이 슬롯 포기`);
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 1) {
        console.warn(`[gemini-image] slot ${slot}: 1차 호출 실패 (${msg}) — 재시도`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.warn(`[gemini-image] slot ${slot}: 재시도도 실패 (${msg}) — 이 슬롯 포기`);
      return null;
    }
  }
  return null;
}

/* ── HttpAdapter (Port 구현체) ─────────────────────────────────── */

export const geminiImage = {
  get isConfigured() {
    return !!process.env.GOOGLE_AI_API_KEY;
  },

  async generate(params: GenerateImageParams): Promise<GenerateImageResult> {
    const prompt = params.prompt?.trim();
    if (!prompt) throw new Error("이미지 프롬프트가 비어 있어요.");

    const apiKey = requireEnv("GOOGLE_AI_API_KEY");
    const count = Math.max(1, Math.min(MAX_COUNT, params.count ?? DEFAULT_COUNT));
    const refs = Array.isArray(params.referenceImages) ? params.referenceImages : [];

    const ai = new GoogleGenAI({ apiKey });
    const contents = buildContents(prompt, refs);

    // 슬롯마다 시작을 STAGGER_MS 씩 늦춰서(0초, 0.6초, 1.2초 …) 동시 요청 폭발을 피한다.
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
