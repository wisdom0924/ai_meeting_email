import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

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

    const prompt = `당신은 회의의 내용을 정확하게 요약하는 전문가입니다. 핵심 내용만 간결하게 요약해주세요. 중요한 논의 사항, 결정된 사항, 액션 아이템을 중심으로 요약해주세요.

다음은 회의의 전체 녹음 내용(텍스트)입니다. 
이 내용을 바탕으로 두 가지 형식의 데이터를 작성해주세요.

1. "summary": 회의 내용을 500자 내외로 자연스럽게 요약한 줄글 텍스트. (중요한 논의 사항, 결정된 사항, 액션 아이템 중심)
2. "details": 상세 회의록 객체. 다음 구조를 갖는 JSON 형식이어야 합니다.
{
  "title": "회의 제목",
  "meta": {
    "회의 제목": "...",
    "회의 일시": "...",
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
  "nextMeeting": "다음 회의 일정",
  "additionalNotes": "기타 추가 논의 사항"
}

반드시 위 구조를 갖는 JSON 형식으로만 응답해주세요.
{
  "summary": "요약 내용...",
  "details": {
    ...details 객체
  }
}

회의 텍스트:
${text}`;

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

    return NextResponse.json(resultJson);

  } catch (error) {
    console.error('Gemini 요약 에러:', error);
    return NextResponse.json(
      { error: '회의록을 분석하고 요약하는 중 문제가 발생했습니다.' },
      { status: 500 }
    );
  }
}
