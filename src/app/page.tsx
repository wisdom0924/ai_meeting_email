"use client";

import { useState, useEffect, useRef } from "react";
import { TranscriptBlock, Memo } from "@/types";
import Header from "@/components/Header";
import RecordPanel from "@/components/RecordPanel";
import TranscriptPanel from "@/components/TranscriptPanel";

export default function Home() {
  // 메모 목록을 저장하는 공간입니다. 처음에는 비어있습니다.
  const [memos, setMemos] = useState<Memo[]>([]);

  // 녹음 중인지 아닌지(상태)와 몇 초가 지났는지(진행 시간) 기억하는 공간이에요.
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // 실시간 음성 인식 결과를 저장하는 공간이에요.
  const [transcript, setTranscript] = useState(""); // 변환 중인 상태 메시지
  const [fullTranscript, setFullTranscript] = useState<TranscriptBlock[]>([]); // 완전히 끝난 문장들 모음
  const [isTranscribing, setIsTranscribing] = useState(false); // AI가 글자로 바꾸고 있는지 확인하는 마크

  // 오디오 녹음과 웹소켓 통신을 위한 도구들이에요.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // 녹음 버튼을 누를 때 실행되는 함수예요.
  const handleToggleRecord = async () => {
    if (!isRecording) {
      try {
        // 1. 마이크 권한을 허락받고 소리를 가져옵니다.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
              const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
              const sentences = data.text.split('. ').filter((s: string) => s.trim().length > 0).map((s: string) => s + '.');
              const newBlocks = (sentences.length > 0 ? sentences : [data.text]).map((text: string, index: number) => ({
                id: `${Date.now()}-${index}`,
                text,
                time: nowTime
              }));
              setFullTranscript((prev) => [...prev, ...newBlocks]);
              setTranscript("");
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
        setTranscript("");

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
        
        setIsRecording(true);
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
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      } else {
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

        const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        setTimeout(() => {
          const mockSentences = [
            "안녕하세요! 오늘 회의에서는 새로운 AI 회의록 마법사 프로젝트에 대해 논의하겠습니다.",
            "이 프로그램은 사용자의 목소리를 듣고 실시간으로 글자로 바꿔주는 아주 신기한 프로그램입니다.",
            "마이크가 없는 데스크탑에서도 이렇게 가짜 데이터를 통해 아주 쉽게 테스트해 볼 수 있습니다.",
            "모두 수고하셨습니다. 다음 회의 때 뵙겠습니다!"
          ];
          const newBlocks = mockSentences.map((text, index) => ({
            id: `mock-${Date.now()}-${index}`,
            text,
            time: nowTime
          }));
          setFullTranscript((prev) => [...prev, ...newBlocks]);
          setTranscript("");
          setIsTranscribing(false);
        }, 3000);
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

  // '전송' 버튼을 누르면 실행되는 함수입니다. (메모 추가하기)
  const handleAddMemo = (text: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const newMemo: Memo = {
      id: Date.now(),
      text: text,
      time: timeString,
      type: 'text'
    };

    setMemos((prev) => [...prev, newMemo]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900 font-sans">
      {/* 1. 상단 제목 부분 */}
      <Header />

      <main className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
        {/* 2. 왼쪽: 녹음 버튼과 메모장 부분 */}
        <RecordPanel 
          isRecording={isRecording}
          recordingTime={recordingTime}
          onToggleRecord={handleToggleRecord}
          memos={memos}
          onAddMemo={handleAddMemo}
        />
        
        {/* 3. 오른쪽: AI가 작성해주는 회의록 부분 */}
        <TranscriptPanel 
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          transcript={transcript}
          fullTranscript={fullTranscript}
        />
      </main>
    </div>
  );
}
