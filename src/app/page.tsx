"use client";

import { useState } from "react";

// 메모 데이터의 모양을 정의합니다.
type Memo = {
  id: number;
  text: string;
  time: string;
};

export default function Home() {
  // 메모 목록을 저장하는 공간입니다. 처음에는 비어있습니다.
  const [memos, setMemos] = useState<Memo[]>([]);
  
  // 사용자가 입력창에 쓰고 있는 글자를 저장하는 공간입니다.
  const [inputText, setInputText] = useState("");

  // '전송' 버튼을 누르면 실행되는 함수입니다.
  const handleAddMemo = () => {
    // 빈칸이거나 띄어쓰기만 있으면 아무것도 하지 않습니다.
    if (inputText.trim() === "") return;

    // 현재 시간을 "오전/오후 00:00" 형식으로 만듭니다.
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // 새로운 메모를 만듭니다.
    const newMemo: Memo = {
      id: Date.now(), // 방금 만든 시간을 고유 번호로 씁니다.
      text: inputText,
      time: timeString,
    };

    // 기존 메모 목록 끝에 새로운 메모를 추가합니다.
    setMemos([...memos, newMemo]);
    
    // 입력창을 다시 비워줍니다.
    setInputText("");
  };

  // 키보드에서 'Enter' 키를 누르면 글이 써지도록 합니다.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift 키를 누른 상태로 Enter를 치면 줄바꿈이 되고, 그냥 Enter만 치면 전송됩니다.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // 기본 줄바꿈 동작을 막습니다.
      handleAddMemo();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900 font-sans">
      {/* 헤더 영역 (맨 위) */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="text-2xl">🎙️</div>
          <h1 className="text-xl font-bold text-primary">AI 회의록 마법사</h1>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
          <span className="text-xl">⚙️</span>
        </button>
      </header>

      {/* 메인 콘텐츠 영역 (가운데 넓은 부분) */}
      <main className="flex flex-1 overflow-hidden">
        {/* 왼쪽 패널: 녹음 버튼 & 메모장 */}
        <section className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50/50">
          
          {/* 녹음 컨트롤러 부분 */}
          <div className="p-6 border-b border-gray-200 flex flex-col items-center justify-center gap-4 bg-white">
            <div className="text-4xl font-mono font-medium text-gray-800">
              00:00
            </div>
            <div className="flex gap-4">
              <button className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-full font-bold shadow-sm transition-colors">
                <span className="text-sm">🔴</span> 녹음 시작
              </button>
            </div>
          </div>

          {/* 실시간 메모 리스트 & 입력창 */}
          <div className="flex flex-col flex-1 p-6 overflow-hidden">
            <h2 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
              <span>📝</span> 실시간 메모
            </h2>
            
            {/* 메모가 쌓이는 공간 (말풍선 형태) */}
            <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-4">
              {memos.length === 0 ? (
                <div className="text-gray-400 text-sm text-center mt-10">
                  아직 작성된 메모가 없습니다.<br/>회의 중 중요한 내용을 기록해보세요!
                </div>
              ) : (
                memos.map((memo) => (
                  <div key={memo.id} className="flex flex-col items-end">
                    <div className="bg-primary/10 text-gray-800 px-4 py-2 rounded-2xl rounded-tr-sm inline-block max-w-[90%] shadow-sm text-sm">
                      {memo.text}
                    </div>
                    <span className="text-xs text-gray-400 mt-1">{memo.time}</span>
                  </div>
                ))
              )}
            </div>

            {/* 메모 입력창과 버튼 */}
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
                <span className="text-lg">⬆️</span>
              </button>
            </div>
          </div>
          
        </section>

        {/* 오른쪽 패널: AI 회의록 & 요약 */}
        <section className="flex-1 flex flex-col bg-white">
          <div className="flex-1 p-8 border-b border-gray-200 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span>✨</span> AI 회의록
            </h2>
            <div className="text-gray-500 italic flex h-full items-center justify-center">
              녹음을 시작하면 이곳에 회의 내용이 자동으로 적힙니다...
            </div>
          </div>
          
          <div className="h-1/3 p-8 bg-gray-50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>💡</span> 핵심 요약
            </h2>
            <div className="text-gray-500 italic flex h-full items-center justify-center">
              회의가 끝나면 AI가 핵심 내용을 이곳에 요약해 줍니다...
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
