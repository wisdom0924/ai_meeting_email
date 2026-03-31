"use client";

import { useState } from "react";
import { TranscriptBlock } from "@/types";

interface TranscriptPanelProps {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  fullTranscript: TranscriptBlock[];
  summary?: string;
  details?: any;
}

export default function TranscriptPanel({
  isRecording,
  isTranscribing,
  transcript,
  fullTranscript,
  summary,
  details
}: TranscriptPanelProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'details'>('summary');

  return (
    <section className="w-full md:flex-1 min-h-[60vh] md:min-h-0 flex flex-col bg-white">
      <div className="flex-1 p-6 md:p-8 border-b border-gray-200 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span>✨</span>AI 회의록
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
      
      <div className="h-auto md:h-1/3 p-6 md:p-8 bg-gray-50 flex-none flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>💡</span> 핵심 요약
          </h2>
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'summary' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              요약
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'details' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              상세보기
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-100 p-4">
          {activeTab === 'summary' ? (
            summary ? (
              <div 
                className="text-gray-700 whitespace-pre-wrap leading-relaxed outline-none hover:bg-gray-50 focus:bg-gray-50 transition-colors p-2 rounded cursor-text"
                contentEditable={true}
                suppressContentEditableWarning={true}
              >
                {summary}
              </div>
            ) : (
              <div className="text-gray-500 italic flex h-32 md:h-full items-center justify-center">
                회의가 끝나면 AI가 핵심 내용을 이곳에 요약해 줍니다...
              </div>
            )
          ) : (
            details ? (
              <div 
                className="p-6 md:p-8 rounded-lg text-gray-900 font-sans text-sm md:text-base leading-relaxed h-full overflow-y-auto outline-none hover:bg-gray-50 focus:bg-gray-50 transition-colors cursor-text"
                contentEditable={true}
                suppressContentEditableWarning={true}
              >
                <div className="text-xs text-gray-400 mb-6 flex items-center gap-1 cursor-default select-none" contentEditable={false}>
                  <span>✏️</span> 텍스트를 마우스로 클릭하면 내용을 자유롭게 수정할 수 있습니다.
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-6 tracking-tight">{details.title}</h3>
                
                <div className="mb-8 space-y-1">
                  {Object.entries(details.meta).map(([key, value]) => (
                    <div key={key}>
                      {key} : {value as React.ReactNode}
                    </div>
                  ))}
                </div>

                <div className="space-y-8 mb-8">
                  {details.agendas.map((agenda: any, idx: number) => (
                    <div key={idx}>
                      <div className="mb-2">{agenda.title}</div>
                      <div className="flex mb-2">
                        <span className="mr-2 whitespace-nowrap">논의 내용 :</span>
                        <div>
                          {agenda.discussions.map((d: string, i: number) => (
                            <div key={i}>{d}</div>
                          ))}
                        </div>
                      </div>
                  <div className="mb-2 whitespace-pre-line">
                    결정 사항 : {agenda.decisions}
                  </div>
                      <div>
                        액션 아이템 : {agenda.actions}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <div>
                    다음 회의 일정 : {details.nextMeeting}
                  </div>
                  <div>
                    추가 논의 사항 : {details.additionalNotes}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 italic flex h-32 md:h-full items-center justify-center">
                회의의 상세한 분석 내용이 이곳에 표시됩니다...
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
