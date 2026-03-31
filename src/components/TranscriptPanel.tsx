import { TranscriptBlock } from "@/types";

interface TranscriptPanelProps {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  fullTranscript: TranscriptBlock[];
}

export default function TranscriptPanel({
  isRecording,
  isTranscribing,
  transcript,
  fullTranscript
}: TranscriptPanelProps) {
  return (
    <section className="w-full md:flex-1 min-h-[60vh] md:min-h-0 flex flex-col bg-white">
      <div className="flex-1 p-6 md:p-8 border-b border-gray-200 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span>✨</span> AI 회의록
        </h2>
        
        {/* 글자가 나타나는 곳! */}
        {!isRecording && fullTranscript.length === 0 && !isTranscribing && (
          <div className="text-gray-500 italic flex h-full items-center justify-center">
            녹음을 시작하면 이곳에 회의 내용이 자동으로 적힙니다...
          </div>
        )}
        
        <div className="space-y-4 text-gray-800 leading-relaxed">
          {/* 이미 말하기 완료된 문장들 */}
          {fullTranscript.map((block) => (
            <div key={block.id} className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <span>🕒</span> {block.time}
              </div>
              <p>{block.text}</p>
            </div>
          ))}
          
          {/* 지금 막 말하고 있는 중인 문장 (진한 글씨로 표시) */}
          {transcript && (
            <div className="flex flex-col gap-3 justify-center items-center py-10">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-primary font-medium text-center animate-pulse">
                {transcript}
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className="h-auto md:h-1/3 p-6 md:p-8 bg-gray-50 flex-none">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>💡</span> 핵심 요약
        </h2>
        <div className="text-gray-500 italic flex h-32 md:h-full items-center justify-center">
          회의가 끝나면 AI가 핵심 내용을 이곳에 요약해 줍니다...
        </div>
      </div>
    </section>
  );
}
