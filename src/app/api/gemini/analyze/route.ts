import { NextResponse } from "next/server";
import {
  analyzeMeetingContent,
  formatGeminiAnalyzeError,
} from "@/lib/gemini-analyze";
import { requireAuthenticatedUserForApi } from "@/lib/require-authenticated-user";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUserForApi();
    if (!auth.ok) return auth.response;

    const { text, memos, summaryPrompt, detailsPrompt } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "텍스트가 제공되지 않았습니다." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: "Gemini API 키가 설정되지 않았습니다. .env 파일에 GEMINI_API_KEY를 추가해주세요.",
        },
        { status: 500 }
      );
    }

    const result = await analyzeMeetingContent({
      text,
      memos,
      summaryPrompt,
      detailsPrompt,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Gemini 요약 에러:", error);
    return NextResponse.json(
      { error: formatGeminiAnalyzeError(error) },
      { status: 500 }
    );
  }
}
