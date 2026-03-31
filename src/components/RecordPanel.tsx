"use client";

import { useState } from "react";
import { Memo } from "@/types";

interface RecordPanelProps {
  isRecording: boolean;
  recordingTime: number;
  onToggleRecord: () => void;
  memos: Memo[];
  onAddMemo: (text: string) => void;
  audioLevel?: number; // 소리 크기를 받아오는 속성 추가
}

export default function RecordPanel({
  isRecording,
  recordingTime,
  onToggleRecord,
  memos,
  onAddMemo,
  audioLevel = 0
}: RecordPanelProps) {
  // 사용자가 입력창에 쓰고 있는 글자를 저장하는 공간입니다.
  const [inputText, setInputText] = useState("");

  // 초(seconds)를 받아서 '00:00' 모양으로 예쁘게 바꿔주는 함수예요.
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddMemo = () => {
    if (inputText.trim() === "") return;
    onAddMemo(inputText);
    setInputText(""); // 전송 후 입력창 비우기
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift키 안누르고 Enter키만 눌렀을 때 메모가 전송되게 합니다!
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddMemo();
    }
  };

  return (
    <section className="w-full md:w-1/3 min-h-[60vh] md:min-h-0 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col bg-gray-50/50">
      
      {/* 녹음 컨트롤러 부분 */}
      <div className="p-4 md:p-6 border-b border-gray-200 flex flex-col items-center justify-center gap-4 bg-white">
        <div className="text-5xl md:text-4xl font-mono font-medium text-gray-800 flex items-center gap-4">
          {isRecording && (
            <div className="flex items-center gap-1 h-10">
              {[
                { delay: '0ms', baseH: 'h-4' },
                { delay: '150ms', baseH: 'h-8' },
                { delay: '300ms', baseH: 'h-5' },
                { delay: '450ms', baseH: 'h-7' },
                { delay: '600ms', baseH: 'h-3' },
              ].map((bar, i) => (
                <div 
                  key={i}
                  className={`w-1.5 bg-red-500 rounded-full transition-all duration-300 ${
                    audioLevel > 5 ? `animate-bounce ${bar.baseH}` : 'h-1.5'
                  }`} 
                  style={{ animationDelay: bar.delay }}
                ></div>
              ))}
            </div>
          )}
          <span className={isRecording ? "text-red-500" : ""}>
            {formatTime(recordingTime)}
          </span>
        </div>
        <div className="flex gap-4 w-full px-4 md:px-0 justify-center">
          <button 
            onClick={onToggleRecord}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-4 md:px-6 md:py-3 rounded-full font-bold shadow-sm transition-colors text-lg md:text-base ${
              isRecording 
                ? "bg-red-100 text-red-600 hover:bg-red-200" 
                : "bg-primary hover:bg-primary/90 text-white" 
            }`}
          >
            <span className="text-xl md:text-sm">{isRecording ? "⏹️" : "🔴"}</span> 
            {isRecording ? "녹음 중지" : "녹음 시작"}
          </button>
        </div>
      </div>

      {/* 실시간 메모 리스트 & 입력창 */}
      <div className="flex flex-col flex-1 p-6 overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
          <span>📝</span> 실시간 메모
        </h2>
        
        <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-4">
          {memos.length === 0 ? (
            <div className="text-gray-400 text-sm text-center mt-10">
              아직 작성된 메모가 없습니다.<br/>회의 중 중요한 내용을 기록해보세요!
            </div>
          ) : (
            memos.map((memo) => (
              <div key={memo.id} className={`flex flex-col ${memo.type === 'system' ? 'items-center' : 'items-end'}`}>
                {memo.type === 'system' ? (
                  <div className="bg-gray-100 text-gray-600 px-4 py-3 rounded-lg my-2 text-sm text-center shadow-sm w-full max-w-[90%]">
                    <div className="font-medium">{memo.text}</div>
                    {memo.audioUrl && (
                      <audio controls src={memo.audioUrl} className="w-full h-8 mt-3" />
                    )}
                    <div className="text-xs text-gray-400 mt-2">{memo.time}</div>
                  </div>
                ) : (
                  <>
                    <div className="bg-primary/10 text-gray-800 px-4 py-2 rounded-2xl rounded-tr-sm inline-block max-w-[90%] shadow-sm text-sm">
                      {memo.text}
                    </div>
                    <span className="text-xs text-gray-400 mt-1">{memo.time}</span>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-end gap-2 bg-white border border-gray-200 p-2 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 p-2 max-h-24 resize-none outline-none text-gray-800 placeholder-gray-400 rounded-lg text-sm bg-transparent"
            placeholder="회의 중 떠오르는 내용을 적어보세요... (Enter로 전송)"
            rows={2}
          ></textarea>
          <button 
            onClick={handleAddMemo}
            className="p-2 bg-primary hover:bg-primary/90 text-white rounded-lg shadow-sm transition-colors flex-shrink-0 h-10 w-10 flex items-center justify-center disabled:opacity-50"
            disabled={inputText.trim() === ""}
          >
            <span className="text-lg">⬆</span>
          </button>
        </div>
      </div>
      
    </section>
  );
}
