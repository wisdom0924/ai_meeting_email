import { AssemblyAI } from "assemblyai";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.ASSEMBLY_API_KEY || process.env.ASSEMBLYAI_API_KEY || "";
    
    // API 키가 없으면 에러
    if (!apiKey) {
      return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 400 });
    }

    // AssemblyAI 스트리밍 토큰 발급
    // SDK를 다시 사용합니다 (가장 안전한 방법)
    const client = new AssemblyAI({
      apiKey: apiKey,
    });

    const token = await client.realtime.createTemporaryToken({ expires_in: 3600 });
    
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Token generation failed:", error);
    return NextResponse.json(
      { error: "AssemblyAI 토큰을 발급하는 데 실패했습니다.", details: String(error) },
      { status: 500 }
    );
  }
}

