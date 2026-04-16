import { AssemblyAI } from "assemblyai";

export async function transcribeAudioBuffer(buffer: Buffer): Promise<{
  text: string;
  /** 단어별 시작 시각(ms, 파일 시작 기준). 문장 시각 계산에 사용 */
  words?: unknown;
}> {
  const apiKey = process.env.ASSEMBLY_API_KEY || process.env.ASSEMBLYAI_API_KEY || "";
  if (!apiKey) {
    throw new Error("ASSEMBLY_API_KEY missing");
  }

  const client = new AssemblyAI({ apiKey });
  const transcript = await client.transcripts.transcribe({
    audio: buffer,
    language_code: "ko",
    speech_models: ["universal-3-pro", "universal-2"],
  });

  if (transcript.status === "error") {
    throw new Error(transcript.error || "transcribe error");
  }

  const text = transcript.text ?? "";
  return { text, words: transcript.words };
}
