export const DEFAULT_SUMMARY_PROMPT = `회의 내용을 500자 내외로 자연스럽게 요약한 줄글 텍스트. (중요한 논의 사항, 결정된 사항, 액션 아이템 중심)`;

export const DEFAULT_DETAILS_PROMPT = `회의의 전체적인 흐름과 안건별 세부 논의 사항을 상세하게 정리한 텍스트.`;

/** 서버 프롬프트 목록에서 현재 선택 중인 항목 ID (localStorage) */
export const SELECTED_PROMPT_ID_KEY = "ai_meeting_selected_prompt_id";
