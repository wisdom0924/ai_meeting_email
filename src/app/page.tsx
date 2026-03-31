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

  // 실시간 음성 인식 결과를 저장하는 공간이에요.
  const [transcript, setTranscript] = useState(""); // 변환 중인 상태 메시지
  const [fullTranscript, setFullTranscript] = useState<string[]>([]); // 완전히 끝난 문장들 모음
  const [isTranscribing, setIsTranscribing] = useState(false); // AI가 글자로 바꾸고 있는지 확인하는 마크

  // 오디오 녹음과 웹소켓 통신을 위한 도구들이에요.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // AssemblyAI로 소리를 보내기 위한 웹소켓(WebSocket)이에요.
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioInputRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // 녹음 버튼을 누를 때 실행되는 함수예요.
  const handleToggleRecord = async () => {
    if (!isRecording) {
      try {
        // 1. 마이크 권한을 허락받고 소리를 가져옵니다.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // [실시간 웹소켓 기능 백업 (필요시 사용)]
        /*
        const response = await fetch('/api/assemblyai/token');
        const data = await response.json();
        // ... (이전에 있던 웹소켓 코드)
        */
        
        // 4. 원래 있던 녹음 파일(WebM) 저장용 마법사(MediaRecorder)를 켭니다.
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // 아이폰(Safari) 등 기기마다 지원하는 오디오 형식이 달라서(mp4, webm 등), 
          // 기기가 실제로 녹음한 형식(mimeType)을 확인해서 사용합니다.
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';
          
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          const now = new Date();
          setMemos((prev) => [
            ...prev,
            {
              id: Date.now(),
              text: "⏹️ 녹음이 종료되었습니다. AI가 회의록을 작성 중입니다...",
              time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
              audioUrl: audioUrl,
              type: 'system'
            }
          ]);

          // 녹음이 끝나면 서버로 오디오 파일을 보내서 변환해달라고 부탁합니다!
          try {
            setIsTranscribing(true);
            setTranscript("AI가 녹음된 목소리를 열심히 듣고 글자로 바꾸고 있어요! (약 10~30초 소요)");

            const formData = new FormData();
            formData.append("audio", audioBlob, `recording.${fileExtension}`);

            const response = await fetch('/api/assemblyai/transcribe', {
              method: 'POST',
              body: formData,
            });

            const data = await response.json();

            if (data.error) {
              setTranscript("앗, 글자로 바꾸는 중에 문제가 생겼어요: " + data.error);
            } else {
              // 성공적으로 글자를 받아왔으면 화면에 보여줍니다!
              // 만약 문장이 너무 길면 보기 좋게 마침표(.)를 기준으로 나눠줍니다.
              const sentences = data.text.split('. ').filter((s: string) => s.trim().length > 0).map((s: string) => s + '.');
              setFullTranscript(sentences.length > 0 ? sentences : [data.text]);
              setTranscript(""); // 로딩 메시지 지우기
            }
          } catch (error) {
            console.error("변환 요청 실패:", error);
            setTranscript("서버와 통신하는 데 실패했어요.");
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setFullTranscript([]); // 이전 회의록 초기화
        setTranscript(""); // 이전 임시 텍스트 초기화

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
        console.error("마이크 접근 실패, 가상 녹음 모드로 전환합니다:", error);
        
        // --- 데스크탑용 가짜(Mock) 녹음 기능 ---
        // 마이크가 없어도 테스트할 수 있게 해줍니다!
        setIsRecording(true);
        setFullTranscript([]); 
        setTranscript(""); 
        
        const now = new Date();
        setMemos((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "🔴 [테스트 모드] 가짜 녹음이 시작되었습니다.",
            time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            type: 'system'
          }
        ]);
        // ----------------------------------------
      }
    } else {
      // 녹음 중이었다면 모두 멈춰줍니다.
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      } else {
        // --- 가상 녹음 종료 및 가짜 데이터 생성 ---
        const now = new Date();
        setMemos((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "⏹️ [테스트 모드] 녹음이 종료되었습니다. AI가 회의록을 작성 중입니다...",
            time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            type: 'system'
          }
        ]);

        setIsTranscribing(true);
        setTranscript("AI가 녹음된 목소리를 열심히 듣고 글자로 바꾸고 있어요! (약 3초 소요)");

        // 3초 뒤에 가짜 회의록이 나오도록 마법을 겁니다!
        setTimeout(() => {
          setFullTranscript([
            "안녕하세요! 오늘 회의에서는 새로운 AI 회의록 마법사 프로젝트에 대해 논의하겠습니다.",
            "이 프로그램은 사용자의 목소리를 듣고 실시간으로 글자로 바꿔주는 아주 신기한 프로그램입니다.",
            "마이크가 없는 데스크탑에서도 이렇게 가짜 데이터를 통해 아주 쉽게 테스트해 볼 수 있습니다.",
            "모두 수고하셨습니다. 다음 회의 때 뵙겠습니다!"
          ]);
          setTranscript("");
          setIsTranscribing(false);
        }, 3000);
        // ----------------------------------------
      }

      setIsRecording(false);
    }
  };

  // 녹음이 시작되면 1초마다 시간을 1씩 올려주는 마법(타이머)입니다.
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    
    return () => clearInterval(interval);
  }, [isRecording]);

  // 초(seconds)를 받아서 '00:00' 모양으로 예쁘게 바꿔주는 함수예요.
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // '전송' 버튼을 누르면 실행되는 함수입니다.
  const handleAddMemo = () => {
    if (inputText.trim() === "") return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const newMemo: Memo = {
      id: Date.now(),
      text: inputText,
      time: timeString,
      type: 'text'
    };

    setMemos([...memos, newMemo]);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
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
      <main className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
        {/* 왼쪽 패널: 녹음 버튼 & 메모장 */}
        <section className="w-full md:w-1/3 min-h-[60vh] md:min-h-0 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col bg-gray-50/50">
          
          {/* 녹음 컨트롤러 부분 */}
          <div className="p-4 md:p-6 border-b border-gray-200 flex flex-col items-center justify-center gap-4 bg-white">
            <div className="text-5xl md:text-4xl font-mono font-medium text-gray-800 flex items-center gap-4">
              {isRecording && (
                <div className="flex items-center gap-1 h-8 md:h-8 h-10">
                  <div className="w-1.5 h-4 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-8 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <div className="w-1.5 h-7 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
                  <div className="w-1.5 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
                </div>
              )}
              <span className={isRecording ? "text-red-500" : ""}>
                {formatTime(recordingTime)}
              </span>
            </div>
            <div className="flex gap-4 w-full px-4 md:px-0">
              <button 
                onClick={handleToggleRecord}
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
                <span className="text-lg">⬆️</span>
              </button>
            </div>
          </div>
          
        </section>

        {/* 오른쪽 패널: AI 회의록 & 요약 */}
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
              {fullTranscript.map((text, idx) => (
                <p key={idx} className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-100">
                  {text}
                </p>
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
      </main>
    </div>
  );
}
