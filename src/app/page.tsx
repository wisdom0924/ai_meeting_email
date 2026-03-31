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
  const [summary, setSummary] = useState(""); // 500자 요약 데이터 상태 저장공간 추가
  const [details, setDetails] = useState<any>(null); // 상세 회의록 데이터 상태 추가

  // 오디오 녹음과 웹소켓 통신을 위한 도구들이에요.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // 마이크 소리 크기를 감지하기 위한 도구들이에요.
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // 녹음 버튼을 누를 때 실행되는 함수예요.
  const handleToggleRecord = async () => {
    if (!isRecording) {
      try {
        // 1. 마이크 권한을 허락받고 소리를 가져옵니다.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // --- 마이크 소리 크기를 측정하는 부분 시작 ---
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let lastUpdateTime = 0;

        const updateAudioLevel = (time: number) => {
          if (!analyserRef.current) return;
          
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

          // 너무 자주 업데이트하면 컴퓨터가 힘들어하니, 1초에 10번 정도만 업데이트해요. (100ms 간격)
          if (time - lastUpdateTime < 100) return;
          lastUpdateTime = time;

          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setAudioLevel(average);
        };
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        // --- 마이크 소리 크기를 측정하는 부분 끝 ---

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

            // 1. 음성을 텍스트로 변환 (AssemblyAI)
            const response = await fetch('/api/assemblyai/transcribe', {
              method: 'POST',
              body: formData,
            });

            const data = await response.json();

            if (data.error) {
              setTranscript("앗, 글자로 바꾸는 중에 문제가 생겼어요: " + data.error);
              setIsTranscribing(false);
              return;
            }

            const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            const sentences = data.text.split('. ').filter((s: string) => s.trim().length > 0).map((s: string) => s + '.');
            const newBlocks = (sentences.length > 0 ? sentences : [data.text]).map((text: string, index: number) => ({
              id: `${Date.now()}-${index}`,
              text,
              time: nowTime
            }));
            
            setFullTranscript((prev) => [...prev, ...newBlocks]);
            setTranscript("회의 내용을 바탕으로 요약본과 상세 회의록을 만들고 있어요! (약 10초 소요)");

            // 2. 텍스트를 바탕으로 요약 및 상세 정보 생성 (Gemini API)
            const analyzeResponse = await fetch('/api/gemini/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: data.text })
            });

            const analyzeData = await analyzeResponse.json();

            if (analyzeData.error) {
              setTranscript("요약본을 만드는 중에 문제가 생겼어요: " + analyzeData.error);
            } else {
              if (analyzeData.summary) setSummary(analyzeData.summary);
              if (analyzeData.details) setDetails(analyzeData.details);
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
        setSummary("");
        setDetails(null);

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
        console.error("마이크 접근 실패:", error);
        setTranscript("마이크를 사용할 수 없거나 접근 권한이 없습니다.");
      }
    } else {
      // 녹음을 멈출 때, 소리 크기 측정도 함께 멈춥니다.
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setAudioLevel(0);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
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
          audioLevel={audioLevel}
        />
        
        {/* 3. 오른쪽: AI가 작성해주는 회의록 부분 */}
        <TranscriptPanel 
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          transcript={transcript}
          fullTranscript={fullTranscript}
          summary={summary}
          details={details}
        />
      </main>
    </div>
  );
}
