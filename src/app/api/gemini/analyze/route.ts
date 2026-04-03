import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { deepStripBasicMarkdown } from '@/lib/strip-markdown';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { text, memos, summaryPrompt, detailsPrompt } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: '텍스트가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다. .env 파일에 GEMINI_API_KEY를 추가해주세요.' },
        { status: 500 }
      );
    }

    const finalSummaryPrompt = summaryPrompt || `회의 내용을 500자 내외로 자연스럽게 요약한 줄글 텍스트. (중요한 논의 사항, 결정된 사항, 액션 아이템 중심)`;
    const finalDetailsPrompt = detailsPrompt || `회의의 전체적인 흐름과 안건별 세부 논의 사항을 상세하게 정리한 텍스트.`;

    const prompt = `당신은 회의의 내용을 정확하게 요약하는 전문가입니다.

다음은 회의의 전체 녹음 내용(텍스트)과 사용자가 회의 중 작성한 메모입니다. 
이 내용을 바탕으로 데이터를 작성해주세요. 메모 내용도 회의록과 요약에 자연스럽게 반영해주세요.

1. "summary": ${finalSummaryPrompt}
2. "details": 다음 지시사항에 맞게 상세 내용을 작성해주세요. 지시사항: ${finalDetailsPrompt}

반드시 다음 구조를 갖는 JSON 형식으로만 응답해주세요. 응답은 다른 텍스트 없이 오직 JSON 객체만 있어야 합니다.
모든 문자열 값은 마크다운 기호(#, *, **, 밑줄 강조 등) 없이 평문만 사용해주세요.
meta의 "회의 일시"는 반드시 YYYY-MM-DD 숫자 형식만 사용하세요(예: 2026-04-03). 시각은 넣지 말고, 녹음·회의 날짜를 특정할 수 없으면 빈 문자열로 두세요.
{
  "summary": "요약 내용...",
  "details": {
    "title": "회의 제목",
    "meta": {
      "회의 제목": "...",
      "회의 일시": "YYYY-MM-DD 또는 빈 문자열",
      "장소": "...",
      "참석자": "...",
      "주최자": "...",
      "회의 목적": "..."
    },
    "agendas": [
      {
        "title": "안건 1...",
        "discussions": ["논의 내용 1", "논의 내용 2"],
        "decisions": "결정 사항",
        "actions": "액션 아이템 (담당자 및 기한)"
      }
    ],
    "memoSummary": "사용자가 작성한 메모들을 바탕으로 요약한 내용 (메모가 없다면 빈 문자열)",
    "nextMeeting": "다음 회의 일정",
    "additionalNotes": "기타 추가 논의 사항"
  }
}

회의 텍스트:
${text}

사용자 작성 메모:
${memos ? memos : '작성된 메모가 없습니다.'}`;

    // Gemini 2.5 Flash 모델 사용 (빠르고 비용 효율적)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const responseText = result.response.text();
    const resultJson = JSON.parse(responseText);

    return NextResponse.json(deepStripBasicMarkdown(resultJson));

  } catch (error) {
    console.error('Gemini 요약 에러:', error);
    return NextResponse.json(
      { error: '회의록을 분석하고 요약하는 중 문제가 발생했습니다.' },
      { status: 500 }
    );
  }
}
