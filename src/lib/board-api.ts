const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

export interface Board {
  id: number;
  user_id: number;
  author_nickname?: string | null;
  title: string;
  content: string;
  meeting_id?: number | null;
  created_at: string;
  updated_at?: string | null;
  comment_count?: number;
}

export interface Comment {
  id: number;
  board_id: number;
  user_id: number;
  author_nickname?: string | null;
  content: string;
  created_at: string;
  updated_at?: string | null;
}

export async function fetchBoards(page: number = 1, size: number = 10) {
  const res = await fetch(`${API_URL}/api/boards?page=${page}&size=${size}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("게시글 목록을 불러오지 못했습니다.");
  return res.json(); // { items: Board[], total: number, page: number, size: number }
}

export async function fetchBoard(id: number): Promise<Board> {
  const res = await fetch(`${API_URL}/api/boards/${id}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("게시글을 불러오지 못했습니다.");
  return res.json();
}

export async function createBoard(title: string, content: string, meeting_id?: number | null) {
  const res = await fetch(`${API_URL}/api/boards`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ title, content, meeting_id })
  });
  if (!res.ok) throw new Error("게시글을 작성하지 못했습니다.");
  return res.json();
}

export async function updateBoard(id: number, title: string, content: string, meeting_id?: number | null) {
  const res = await fetch(`${API_URL}/api/boards/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ title, content, meeting_id })
  });
  if (!res.ok) throw new Error("게시글을 수정하지 못했습니다.");
  return res.json();
}

export async function deleteBoard(id: number) {
  const res = await fetch(`${API_URL}/api/boards/${id}`, {
    method: "DELETE",
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("게시글을 삭제하지 못했습니다.");
  return res.json();
}

export async function fetchComments(boardId: number): Promise<Comment[]> {
  const res = await fetch(`${API_URL}/api/boards/${boardId}/comments`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("댓글을 불러오지 못했습니다.");
  return res.json();
}

export async function createComment(boardId: number, content: string) {
  const res = await fetch(`${API_URL}/api/boards/${boardId}/comments`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ content })
  });
  if (!res.ok) throw new Error("댓글을 작성하지 못했습니다.");
  return res.json();
}

export async function deleteComment(commentId: number) {
  const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
    method: "DELETE",
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("댓글을 삭제하지 못했습니다.");
  return res.json();
}

export async function updateComment(commentId: number, content: string) {
  const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ content })
  });
  if (!res.ok) throw new Error("댓글을 수정하지 못했습니다.");
  return res.json();
}
