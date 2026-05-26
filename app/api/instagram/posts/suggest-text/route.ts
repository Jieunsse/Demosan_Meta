import { NextRequest, NextResponse } from "next/server";
import { geminiPostSuggest } from "@/lib/gemini-post-suggest";
import { withRouteHandler, ValidationError } from "@/lib/route-handler";

type Body = {
  kind?: "caption" | "image-prompt";
  hint?: string;
  caption?: string;
};

export async function POST(req: NextRequest) {
  return withRouteHandler(
    geminiPostSuggest.isConfigured,
    "GOOGLE_AI_API_KEY 가 .env.local 에 설정되지 않았어요.",
    async () => {
      const body = (await req.json()) as Body;
      const hint = (body.hint ?? "").trim();
      const caption = (body.caption ?? "").trim();
      if (body.kind === "caption") {
        const text = await geminiPostSuggest.suggestCaption(hint);
        return NextResponse.json({ text });
      }
      if (body.kind === "image-prompt") {
        const text = await geminiPostSuggest.suggestImagePrompt(hint, caption);
        return NextResponse.json({ text });
      }
      throw new ValidationError("kind 는 'caption' 또는 'image-prompt' 여야 해요.");
    },
  );
}
