import { AssemblyAI } from "assemblyai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ASSEMBLY_API_KEY || process.env.ASSEMBLYAI_API_KEY || "";
    
    if (!apiKey) {
      return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 400 });
    }

    // 클라이언트(화면)에서 보낸 오디오 파일을 받습니다.
    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob;

    if (!audioFile) {
      return NextResponse.json({ error: "오디오 파일을 찾을 수 없습니다." }, { status: 400 });
    }

    // AssemblyAI 마법사 소환!
    const client = new AssemblyAI({ apiKey });

    // 1. 오디오 파일을 컴퓨터가 읽을 수 있는 버퍼(ArrayBuffer)로 바꿉니다.
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("AssemblyAI로 파일 전송 시작...");

    // 2. AssemblyAI에게 오디오 파일을 보내서 글자로 바꿔달라고 부탁합니다.
    const transcript = await client.transcripts.transcribe({
      audio: buffer,
      language_code: "ko", // 한국어로 인식해달라고 꼭 집어서 말해줍니다.
      speech_models: ["universal-3-pro", "universal-2"], // 음성 인식 모델 (정확도가 높은 순서대로)
    });

    console.log("변환 완료!");

    // 3. 변환된 글자들을 클라이언트에게 돌려줍니다.
    if (transcript.status === 'error') {
      throw new Error(transcript.error);
    }

    return NextResponse.json({ 
      text: transcript.text,
      words: transcript.words // 단어별 시간 정보도 함께 보내줍니다.
    });

  } catch (error) {
    console.error("Transcription failed:", error);
    return NextResponse.json(
      { error: "음성을 글자로 변환하는 데 실패했습니다.", details: String(error) },
      { status: 500 }
    );
  }
}
