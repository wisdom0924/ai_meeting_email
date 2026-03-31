// 회의록 데이터의 모양을 정의합니다.
export type TranscriptBlock = {
  id: string;
  text: string;
  time: string;
};

// 메모 데이터의 모양을 정의합니다.
export type Memo = {
  id: number;
  text: string;
  time: string;
  audioUrl?: string; // 오디오 파일 주소가 있으면 오디오 메모!
  type?: 'text' | 'system'; // 'text'는 일반 메모, 'system'은 녹음 시작/종료 알림
};
