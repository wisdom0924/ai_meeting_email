"use client";

import { useState } from "react";
import { Memo } from "@/types";

interface RecordPanelProps {
  isRecording: boolean;
  recordingTime: number;
  onToggleRecord: () => void;
  memos: Memo[];
  onAddMemo: (text: string) => void;
  audioLevel?: number;
}

export default function RecordPanel({
  isRecording,
  recordingTime,
  onToggleRecord,
  memos,
  onAddMemo,
  audioLevel = 0
}: RecordPanelProps) {
  const [inputText, setInputText] = useState("");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddMemo = () => {
    if (inputText.trim() === "") return;
    onAddMemo(inputText);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddMemo();
    }
  };

  return (
    <section className="h-full flex flex-col bg-white">
      
      {/* 녹음 컨트롤러 부분 */}
      <div className="p-8 border-b border-gray-100 flex flex-col items-center justify-center gap-6">
        <div className="text-5xl font-mono font-light tracking-tight text-gray-900 flex items-center justify-center w-full h-16">
          {isRecording ? (
            <span className="text-red-500 animate-pulse">{formatTime(recordingTime)}</span>
          ) : (
            <span className="text-gray-300">00:00</span>
          )}
        </div>
        
        {isRecording && (
          <div className="flex items-center gap-1 h-6">
            {[
              { delay: '0ms', baseH: 'h-2' },
              { delay: '150ms', baseH: 'h-5' },
              { delay: '300ms', baseH: 'h-3' },
              { delay: '450ms', baseH: 'h-6' },
              { delay: '600ms', baseH: 'h-2' },
            ].map((bar, i) => (
              <div 
                key={i}
                className={`w-1 bg-gray-900 transition-all duration-300 ${
                  audioLevel > 5 ? `animate-pulse ${bar.baseH}` : 'h-1'
                }`} 
                style={{ animationDelay: bar.delay }}
              ></div>
            ))}
          </div>
        )}

        <button 
          onClick={onToggleRecord}
          className={`w-full py-4 px-6 flex items-center justify-center gap-3 font-medium tracking-wide transition-all duration-300 ${
            isRecording 
              ? "bg-white border-2 border-red-500 text-red-500 hover:bg-red-50" 
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          {isRecording ? (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
              RECORDING
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-white rounded-full"></div>
              START RECORDING
            </>
          )}
        </button>
      </div>

      {/* 실시간 메모 리스트 & 입력창 */}
      <div className="flex flex-col flex-1 p-8 overflow-hidden bg-gray-50/50">
        <h2 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-6">
          Live Notes
        </h2>
        
        <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-6">
          {memos.length === 0 ? (
            <div className="text-gray-400 text-sm flex items-center justify-center h-full font-light">
              No notes yet.
            </div>
          ) : (
            memos.map((memo) => (
              <div key={memo.id} className="flex flex-col gap-1">
                {memo.type === 'system' ? (
                  <div className="w-full text-center py-4">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{memo.text}</span>
                    {memo.audioUrl && (
                      <audio controls src={memo.audioUrl} className="w-full h-8 mt-3 opacity-70 grayscale" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <div className="bg-white border border-gray-100 text-gray-800 px-5 py-3 shadow-sm text-sm w-[85%] leading-relaxed rounded-tl-xl rounded-tr-xl rounded-bl-xl">
                      {memo.text}
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">{memo.time}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-end gap-3">
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 p-4 max-h-24 resize-none outline-none text-gray-800 placeholder-gray-400 bg-white border border-gray-200 focus:border-gray-900 transition-colors text-sm shadow-sm rounded-none"
            placeholder="Type a note..."
            rows={1}
          ></textarea>
          <button 
            onClick={handleAddMemo}
            className="p-4 bg-gray-900 hover:bg-gray-800 text-white transition-colors flex-shrink-0 flex items-center justify-center disabled:opacity-50 disabled:bg-gray-300"
            disabled={inputText.trim() === ""}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
      
    </section>
  );
}
