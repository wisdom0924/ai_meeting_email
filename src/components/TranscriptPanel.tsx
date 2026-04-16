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
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'details'>('transcript');

  return (
    <section className="h-full flex flex-col bg-white">
      {/* 탭 네비게이션 */}
      <div className="flex items-center px-8 md:px-12 pt-8 border-b border-gray-200 bg-gray-50 shrink-0">
        <button
          onClick={() => setActiveTab('transcript')}
          className={`pb-4 px-2 text-sm font-medium transition-all mr-6 ${
            activeTab === 'transcript' 
              ? 'text-gray-900 border-b-2 border-gray-900' 
              : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'
          }`}
        >
          Transcript
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-4 px-2 text-sm font-medium transition-all mr-6 ${
            activeTab === 'summary' 
              ? 'text-gray-900 border-b-2 border-gray-900' 
              : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-4 px-2 text-sm font-medium transition-all ${
            activeTab === 'details' 
              ? 'text-gray-900 border-b-2 border-gray-900' 
              : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'
          }`}
        >
          Details
        </button>
      </div>

      {/* 탭 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-8 md:p-12">
        {activeTab === 'transcript' && (
          <div className="h-full">
            {!isRecording && fullTranscript.length === 0 && !isTranscribing && (
              <div className="text-gray-400 font-light flex h-full items-center justify-center">
                Waiting for recording to start...
              </div>
            )}
            
            <div className="space-y-6 text-gray-800 font-light leading-relaxed pb-8">
              {fullTranscript.map((block) => (
                <div key={block.id} className="flex gap-4 group">
                  <div className="text-xs text-gray-400 font-mono pt-1 min-w-[5.25rem] flex-shrink-0 tabular-nums">
                    {block.time}
                  </div>
                  <p className="flex-1 text-gray-800 group-hover:text-black transition-colors">{block.text}</p>
                </div>
              ))}
              
              {transcript && (
                <div className="flex gap-4 items-start py-4">
                   <div className="text-xs text-gray-400 font-mono pt-1 w-12 flex-shrink-0 flex gap-1">
                     <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                     <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                     <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <p className="flex-1 text-gray-400 animate-pulse">
                    {transcript}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="h-full">
            {summary ? (
              <div 
                className="text-gray-700 font-light whitespace-pre-wrap leading-relaxed outline-none focus:bg-gray-50 transition-colors cursor-text h-full pb-8"
                contentEditable={true}
                suppressContentEditableWarning={true}
              >
                {summary}
              </div>
            ) : (
              <div className="text-gray-400 font-light flex h-full items-center justify-center">
                Summary will appear here after recording...
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="h-full">
            {details ? (
              <div 
                className="text-gray-800 font-light text-sm md:text-base leading-relaxed h-full outline-none focus:bg-gray-50 transition-colors cursor-text pb-8"
                contentEditable={true}
                suppressContentEditableWarning={true}
              >
                <div className="text-xs text-gray-400 mb-8 uppercase tracking-widest flex items-center gap-2 cursor-default select-none" contentEditable={false}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                  Click text to edit
                </div>
                
                {typeof details === 'string' ? (
                  <div className="whitespace-pre-wrap font-medium text-gray-900 leading-relaxed">
                    {details}
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold mb-8 tracking-tight text-gray-900">{details.title}</h3>
                    
                    <div className="mb-10 p-6 bg-gray-50 rounded-none border-l-2 border-gray-900">
                      {Object.entries(details.meta).map(([key, value]) => (
                        <div key={key} className="flex mb-2 last:mb-0">
                          <span className="w-24 text-gray-500">{key}</span>
                          <span className="text-gray-900">{value as React.ReactNode}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-12 mb-12">
                      {details.agendas.map((agenda: any, idx: number) => (
                        <div key={idx}>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">{idx + 1}. {agenda.title}</h4>
                          
                          <div className="flex mb-4">
                            <span className="w-24 text-gray-500 flex-shrink-0">Discussion</span>
                            <div className="flex-1 space-y-2">
                              {agenda.discussions.map((d: string, i: number) => (
                                <div key={i} className="flex gap-2">
                                  <span className="text-gray-300">-</span>
                                  <span>{d}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex mb-4">
                            <span className="w-24 text-gray-500 flex-shrink-0">Decisions</span>
                            <div className="flex-1 whitespace-pre-line text-gray-900 font-medium">
                              {agenda.decisions}
                            </div>
                          </div>
                          
                          <div className="flex">
                            <span className="w-24 text-gray-500 flex-shrink-0">Action Items</span>
                            <div className="flex-1">
                              {agenda.actions}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {details.memoSummary && (
                      <div className="mb-12">
                        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <span className="text-xl">📌</span> Memo Summary
                        </h4>
                        <div className="p-6 bg-yellow-50 rounded-none border-l-2 border-yellow-400 text-gray-800 whitespace-pre-line leading-relaxed">
                          {details.memoSummary}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-gray-100 pt-8 space-y-4">
                      <div className="flex">
                        <span className="w-32 text-gray-500">Next Meeting</span>
                        <span className="text-gray-900">{details.nextMeeting}</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-gray-500">Notes</span>
                        <span className="text-gray-900">{details.additionalNotes}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-gray-400 font-light flex h-full items-center justify-center">
                Detailed notes will appear here...
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
