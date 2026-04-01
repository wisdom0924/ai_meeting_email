"use client";

import { useState, useEffect } from "react";
import { DEFAULT_SUMMARY_PROMPT, DEFAULT_DETAILS_PROMPT } from "@/lib/prompts";

export interface HeaderProps {
  onRefresh?: () => void;
  onSendExternal?: () => void;
  isSending?: boolean;
}

export default function Header({ onRefresh, onSendExternal, isSending }: HeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [summaryPrompt, setSummaryPrompt] = useState("");
  const [detailsPrompt, setDetailsPrompt] = useState("");

  useEffect(() => {
    // 컴포넌트가 마운트될 때 로컬 스토리지에서 저장된 프롬프트를 불러옵니다.
    const savedSummary = localStorage.getItem("summaryPrompt");
    const savedDetails = localStorage.getItem("detailsPrompt");
    
    // 이전에 JSON 형태로 저장되었던 상세 회의록 프롬프트를 확인하고 일반 텍스트로 덮어씌웁니다.
    const isOldJsonFormat = savedDetails?.includes("JSON 형식이어야 합니다");
    
    setSummaryPrompt(savedSummary || DEFAULT_SUMMARY_PROMPT);
    setDetailsPrompt(isOldJsonFormat ? DEFAULT_DETAILS_PROMPT : (savedDetails || DEFAULT_DETAILS_PROMPT));
  }, []);

  const handleSave = () => {
    localStorage.setItem("summaryPrompt", summaryPrompt);
    localStorage.setItem("detailsPrompt", detailsPrompt);
    setIsModalOpen(false);
    alert("프롬프트가 저장되었습니다.");
  };

  const handleReset = () => {
    setSummaryPrompt(DEFAULT_SUMMARY_PROMPT);
    setDetailsPrompt(DEFAULT_DETAILS_PROMPT);
  };

  return (
    <>
      <header className="flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-white text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">AI MEETING</h1>
        </div>
        <div className="flex items-center gap-4">
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="p-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="새로고침"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            </button>
          )}
          {onSendExternal && (
            <button 
              onClick={onSendExternal}
              disabled={isSending}
              className={`p-2 text-sm font-medium text-white rounded-lg flex items-center justify-center transition-colors ${isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              title="외부 전송"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              )}
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
            title="프롬프트 설정"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </header>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">AI 프롬프트 설정</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                <p>AI가 회의록을 작성할 때 사용하는 프롬프트(지시어)를 수정할 수 있습니다.</p>
                <p>요약본과 상세 회의록 각각에 대해 AI에게 어떤 식으로 작성할지 알려주세요.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-gray-900 text-sm">요약 프롬프트 (Summary)</label>
                <textarea 
                  value={summaryPrompt}
                  onChange={(e) => setSummaryPrompt(e.target.value)}
                  className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-none"
                  placeholder="요약본을 위한 프롬프트를 입력하세요..."
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-gray-900 text-sm">상세 회의록 프롬프트 (Details)</label>
                <textarea 
                  value={detailsPrompt}
                  onChange={(e) => setDetailsPrompt(e.target.value)}
                  className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none resize-none"
                  placeholder="상세 회의록에 포함되어야 할 내용이나 강조할 점을 입력하세요..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <button 
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                기본값으로 복구
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  저장하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
