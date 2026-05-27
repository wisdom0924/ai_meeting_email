"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchBoards, Board } from "@/lib/board-api";
import Pagination from "./Pagination";

export default function BoardList({ initialPage = 1 }: { initialPage?: number }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBoards() {
      setLoading(true);
      try {
        const data = await fetchBoards(page, 10);
        setBoards(data.items);
        setTotal(data.total);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadBoards();
  }, [page]);

  if (loading) return <div className="py-10 text-center text-gray-500">불러오는 중...</div>;
  if (error) return <div className="py-10 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold tracking-tight text-gray-900">게시글 목록</h2>
        <Link href="/board/write" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors shadow-sm">
          새 글 작성
        </Link>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {boards.length === 0 ? (
            <li className="p-8 text-center text-sm text-gray-500">아직 작성된 글이 없습니다.</li>
          ) : (
            boards.map((board) => (
              <li key={board.id} className="hover:bg-gray-50 transition-colors">
                <Link href={`/board/${board.id}`} className="block p-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-medium text-gray-900 truncate flex items-center">
                      {board.title}
                      {board.comment_count !== undefined && board.comment_count > 0 && (
                        <span className="ml-2 text-sm text-blue-600 font-semibold">
                          [{board.comment_count}]
                        </span>
                      )}
                    </p>
                    <div className="ml-3 flex-shrink-0 flex">
                      <p className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-600">
                        {new Date(board.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        작성자: {board.author_nickname || `익명 ${board.user_id}`}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>

      <Pagination page={page} total={total} size={10} onPageChange={setPage} />
    </div>
  );
}