import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: '텍스트가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API 키가 설정되지 않았습니다. .env 파일에 OPENAI_API_KEY를 추가해주세요.' },
        { status: 500 }
      );
    }

    const prompt = `다음은 회의의 전체 녹음 내용(텍스트)입니다. 
이 내용을 바탕으로 두 가지 형식의 데이터를 작성해주세요.

1. "summary": 회의 내용을 500자 내외로 자연스럽게 요약한 줄글 텍스트.
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

반드시 아래와 같은 형태의 유효한 JSON 문자열 하나만 응답으로 반환해야 합니다. 다른 말은 절대 추가하지 마세요.
{
  "summary": "요약 내용...",
  "details": {
    ...details 객체
  }
}

회의 텍스트:
${text}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // 비용 효율적이고 빠른 모델
      messages: [
        { role: "system", content: "당신은 전문적이고 꼼꼼한 AI 회의록 작성 마법사입니다. 응답은 반드시 JSON 형식으로만 출력해야 합니다." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const resultString = completion.choices[0].message.content || '{}';
    const resultJson = JSON.parse(resultString);

    return NextResponse.json(resultJson);

  } catch (error) {
    console.error('OpenAI 요약 에러:', error);
    return NextResponse.json(
      { error: '회의록을 분석하고 요약하는 중 문제가 발생했습니다.' },
      { status: 500 }
    );
  }
}