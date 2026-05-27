"use client";

import { useEffect, useState } from "react";
import { fetchBoard, deleteBoard, Board } from "@/lib/board-api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CommentArea from "./CommentArea";

export default function BoardDetail({ id }: { id: number }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // 비밀글 관련 상태
  const [isPrivateError, setIsPrivateError] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  
  const router = useRouter();

  const loadBoard = async (password?: string) => {
    setLoading(true);
    setError(null);
    setIsPrivateError(false);
    try {
      const data = await fetchBoard(id, password);
      setBoard(data);
    } catch (err: any) {
      if (err.message.includes("비밀번호")) {
        setIsPrivateError(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) setCurrentUserId(parseInt(userId, 10));

    loadBoard();
  }, [id]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    loadBoard(passwordInput);
  };

  const handleDelete = async () => {
    if (!confirm("정말 게시글을 삭제할까요?")) return;

    try {
      await deleteBoard(id);
      alert("삭제되었습니다.");
      router.push("/board");
    } catch (err) {
      alert("삭제에 실패했습니다.");
    }
  };

  if (loading) return <div className="py-10 text-center text-gray-500">불러오는 중...</div>;
  
  if (isPrivateError) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-md mx-auto mt-10">
        <div className="mb-4 text-gray-800">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          <h2 className="text-xl font-bold">비밀글입니다</h2>
          <p className="text-sm text-gray-500 mt-1">이 글을 보려면 비밀번호를 입력해주세요.</p>
        </div>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1"
          />
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors">
            확인
          </button>
          <button type="button" onClick={() => router.push("/board")} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors">
            목록으로 돌아가기
          </button>
        </form>
      </div>
    );
  }

  if (error || !board) return <div className="py-10 text-center text-red-500">{error || "게시글이 없습니다."}</div>;

  const isAuthor = currentUserId === board.user_id;

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
      <div className="mb-8 border-b border-gray-100 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-3 flex items-center">
          {board.is_private && (
            <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          )}
          {board.title}
        </h1>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">작성자: {board.author_nickname || `익명 ${board.user_id}`}</span>
            <span>•</span>
            <span>{new Date(board.created_at).toLocaleString()}</span>
          </div>
          {isAuthor && (
            <div className="space-x-3">
              <Link href={`/board/${id}/edit`} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                수정
              </Link>
              <button onClick={handleDelete} className="text-red-500 hover:text-red-700 font-medium transition-colors">
                삭제
              </button>
            </div>
          )}
        </div>
        
        {board.tags && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {board.tags.split(',').map((t, i) => (
              <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md border border-gray-200">
                #{t.trim()}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="prose max-w-none text-gray-800 whitespace-pre-wrap min-h-[200px] leading-relaxed">
        {board.content}
      </div>

      {board.meeting_id && (
        <div className="mt-8 p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-700 text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          이 글에는 회의록 데이터(#{board.meeting_id})가 첨부되어 있습니다.
        </div>
      )}

      <CommentArea boardId={board.id} />
      
      <div className="mt-10 text-center">
        <button onClick={() => router.push("/board")} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors text-sm">
          목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}