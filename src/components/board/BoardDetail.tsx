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
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) setCurrentUserId(parseInt(userId, 10));

    async function loadBoard() {
      try {
        const data = await fetchBoard(id);
        setBoard(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadBoard();
  }, [id]);

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
  if (error || !board) return <div className="py-10 text-center text-red-500">{error || "게시글이 없습니다."}</div>;

  const isAuthor = currentUserId === board.user_id;

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
      <div className="mb-8 border-b border-gray-100 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-3">{board.title}</h1>
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