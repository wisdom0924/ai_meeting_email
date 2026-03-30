"use client";

import { useState, useEffect, useRef } from "react";

// 메모 데이터의 모양을 정의합니다.
type Memo = {
  id: number;
  text: string;
  time: string;
  audioUrl?: string; // 오디오 파일 주소가 있으면 오디오 메모!
  type?: 'text' | 'system'; // 'text'는 일반 메모, 'system'은 녹음 시작/종료 알림
};

export default function Home() {
  // 메모 목록을 저장하는 공간입니다. 처음에는 비어있습니다.
  const [memos, setMemos] = useState<Memo[]>([]);
  
  // 사용자가 입력창에 쓰고 있는 글자를 저장하는 공간입니다.
  const [inputText, setInputText] = useState("");

  // 녹음 중인지 아닌지(상태)와 몇 초가 지났는지(진행 시간) 기억하는 공간이에요.
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // 오디오 녹음을 위한 도구들이에요.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 녹음 버튼을 누를 때 실행되는 함수예요.
  const handleToggleRecord = async () => {
    if (!isRecording) {
      try {
        // 1. 마이크 권한을 허락받고 소리를 가져옵니다.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // 2. 소리를 녹음할 수 있는 마법사(MediaRecorder)를 만들어요.
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        // 3. 소리가 들어올 때마다 조각조각 모아둡니다.
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // 4. 녹음이 끝나면 조각들을 하나로 합쳐서 들을 수 있게 만들어요.
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // 녹음이 끝났다는 메모와 함께 오디오 플레이어를 화면에 추가해요.
          const now = new Date();
          setMemos((prev) => [
            ...prev,
            {
              id: Date.now(),
              text: "⏹️ 녹음이 종료되었습니다.",
              time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
              audioUrl: audioUrl,
              type: 'system'
            }
          ]);
        };

        // 5. 드디어 녹음을 시작해요!
        mediaRecorder.start();
        setIsRecording(true);

        // 녹음 시작 메모를 추가해요.
        const now = new Date();
        setMemos((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "🔴 녹음이 시작되었습니다.",
            time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            type: 'system'
          }
        ]);

      } catch (error) {
        console.error("마이크 권한을 가져오는데 실패했어요:", error);
        alert("마이크 사용 권한을 허용해주세요!");
      }
    } else {
      // 녹음 중이었다면 녹음을 멈춰요.
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        // 마이크 사용도 끝내서 불이 꺼지게 해요.
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    }
  };

  // 녹음이 시작되면 1초마다 시간을 1씩 올려주는 마법(타이머)입니다.
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      // 녹음 중일 때는 1초(1000ms)마다 시간을 1초씩 더해줘요.
      interval = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      // 녹음을 멈추면 시간을 다시 0으로 되돌려요.
      setRecordingTime(0);
    }
    
    // 컴포넌트가 사라지거나 상태가 바뀔 때 타이머를 정리해주는 착한 코드예요.
    return () => clearInterval(interval);
  }, [isRecording]);

  // 초(seconds)를 받아서 '00:00' 모양으로 예쁘게 바꿔주는 함수예요.
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60); // 60초는 1분이니까 60으로 나눠요.
    const secs = seconds % 60;             // 남은 초를 구해요.
    // 1분 5초라면 '01:05' 처럼 앞에 0을 붙여서 두 글자로 맞춰줘요.
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
      type: 'text' // 사용자가 직접 쓴 일반 메모라는 뜻이에요.
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
            <div className="text-4xl font-mono font-medium text-gray-800 flex items-center gap-4">
              {isRecording && (
                // 녹음 중일 때 춤추는 물결(Wave) 모양을 그려주는 부분이에요!
                <div className="flex items-center gap-1 h-8">
                  <div className="w-1.5 h-4 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-8 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <div className="w-1.5 h-7 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
                  <div className="w-1.5 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
                </div>
              )}
              {/* 포맷된 시간을 화면에 보여줘요. 녹음 중이면 빨간색으로 변해요! */}
              <span className={isRecording ? "text-red-500" : ""}>
                {formatTime(recordingTime)}
              </span>
            </div>
            <div className="flex gap-4">
              {/* 버튼을 누르면 handleToggleRecord 함수가 실행되어서 녹음이 진짜로 켜지거나 꺼져요. */}
              <button 
                onClick={handleToggleRecord}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-sm transition-colors ${
                  isRecording 
                    ? "bg-red-100 text-red-600 hover:bg-red-200" // 녹음 중일 때 버튼 모양
                    : "bg-primary hover:bg-primary/90 text-white" // 평소 버튼 모양
                }`}
              >
                <span className="text-sm">{isRecording ? "⏹️" : "🔴"}</span> 
                {isRecording ? "녹음 중지" : "녹음 시작"}
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
                  <div key={memo.id} className={`flex flex-col ${memo.type === 'system' ? 'items-center' : 'items-end'}`}>
                    {memo.type === 'system' ? (
                      // 시스템 알림(녹음 시작/종료) 일 때 보여주는 모양이에요.
                      <div className="bg-gray-100 text-gray-600 px-4 py-3 rounded-lg my-2 text-sm text-center shadow-sm w-full max-w-[90%]">
                        <div className="font-medium">{memo.text}</div>
                        {/* 오디오 파일이 있으면 재생할 수 있는 플레이어를 보여줘요! */}
                        {memo.audioUrl && (
                          <audio controls src={memo.audioUrl} className="w-full h-8 mt-3" />
                        )}
                        <div className="text-xs text-gray-400 mt-2">{memo.time}</div>
                      </div>
                    ) : (
                      // 사용자가 직접 쓴 메모일 때 보여주는 모양이에요.
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
