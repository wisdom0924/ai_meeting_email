import { NextResponse } from "next/server";
import { transcribeAudioBuffer } from "@/lib/assemblyai-transcribe";
import { requireAuthenticatedUserForApi } from "@/lib/require-authenticated-user";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUserForApi();
    if (!auth.ok) return auth.response;

    const apiKey = process.env.ASSEMBLY_API_KEY || process.env.ASSEMBLYAI_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 400 });
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob;

    if (!audioFile) {
      return NextResponse.json({ error: "오디오 파일을 찾을 수 없습니다." }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("AssemblyAI로 파일 전송 시작...");

    const { text, words } = await transcribeAudioBuffer(buffer);

    console.log("변환 완료!");

    return NextResponse.json({
      text,
      words,
    });
  } catch (error) {
    console.error("Transcription failed:", error);
    return NextResponse.json(
      { error: "음성을 글자로 변환하는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
