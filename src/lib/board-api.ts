import { apiFetch, apiJson, publicJson } from "@/lib/api-client";

/**
 * 공유방은 브라우저가 같은 사이트(/api/...)로 요청합니다.
 * Next.js가 FastAPI로 넘겨 줘서, 서버 HTTPS·포트3000 접속에서도
 * "Failed to fetch"가 나지 않게 합니다.
 */
const BOARD_API = "/api";

export interface Board {
  id: number;
  user_id: number;
  author_nickname?: string | null;
  title: string;
  content: string;
  meeting_id?: number | null;
  is_private: boolean;
  tags?: string | null;
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

export interface BoardListResponse {
  items: Board[];
  total: number;
  page: number;
  size: number;
}

export async function fetchBoards(
  page: number = 1,
  size: number = 10,
  keyword?: string,
  tag?: string
): Promise<BoardListResponse> {
  let url = `${BOARD_API}/boards?page=${page}&size=${size}`;
  if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
  if (tag) url += `&tag=${encodeURIComponent(tag)}`;

  return publicJson<BoardListResponse>(
    url,
    {},
    "게시글 목록을 불러오지 못했습니다."
  );
}

export async function fetchBoard(id: number, password?: string): Promise<Board> {
  let url = `${BOARD_API}/boards/${id}`;
  if (password) url += `?password=${encodeURIComponent(password)}`;

  return publicJson<Board>(url, {}, "게시글을 불러오지 못했습니다.");
}

export async function createBoard(
  title: string,
  content: string,
  meeting_id?: number | null,
  is_private: boolean = false,
  password?: string,
  tags?: string
): Promise<Board> {
  return apiJson<Board>(
    `${BOARD_API}/boards`,
    {
      method: "POST",
      body: JSON.stringify({ title, content, meeting_id, is_private, password, tags }),
    },
    "게시글을 작성하지 못했습니다."
  );
}

export async function updateBoard(
  id: number,
  title: string,
  content: string,
  meeting_id?: number | null,
  is_private?: boolean,
  password?: string,
  tags?: string
): Promise<Board> {
  const body: Record<string, unknown> = { title, content, meeting_id };
  if (is_private !== undefined) body.is_private = is_private;
  if (password !== undefined) body.password = password;
  if (tags !== undefined) body.tags = tags;

  return apiJson<Board>(
    `${BOARD_API}/boards/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
    "게시글을 수정하지 못했습니다."
  );
}

export async function deleteBoard(id: number): Promise<{ message: string }> {
  return apiJson<{ message: string }>(
    `${BOARD_API}/boards/${id}`,
    { method: "DELETE" },
    "게시글을 삭제하지 못했습니다."
  );
}

export async function fetchComments(boardId: number): Promise<Comment[]> {
  return publicJson<Comment[]>(
    `${BOARD_API}/boards/${boardId}/comments`,
    {},
    "댓글을 불러오지 못했습니다."
  );
}

export async function createComment(
  boardId: number,
  content: string
): Promise<Comment> {
  return apiJson<Comment>(
    `${BOARD_API}/boards/${boardId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
    "댓글을 작성하지 못했습니다."
  );
}

export async function deleteComment(
  commentId: number
): Promise<{ message: string }> {
  return apiJson<{ message: string }>(
    `${BOARD_API}/comments/${commentId}`,
    { method: "DELETE" },
    "댓글을 삭제하지 못했습니다."
  );
}

export async function updateComment(
  commentId: number,
  content: string
): Promise<Comment> {
  return apiJson<Comment>(
    `${BOARD_API}/comments/${commentId}`,
    {
      method: "PUT",
      body: JSON.stringify({ content }),
    },
    "댓글을 수정하지 못했습니다."
  );
}
