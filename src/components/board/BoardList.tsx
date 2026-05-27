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
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [tag, setTag] = useState("");
  const [tagInput, setTagInput] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput);
    setTag(tagInput);
    setPage(1);
  };

  useEffect(() => {
    async function loadBoards() {
      setLoading(true);
      try {
        const data = await fetchBoards(page, 10, keyword, tag);
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
  }, [page, keyword, tag]);

  if (loading && boards.length === 0) return <div className="py-10 text-center text-gray-500">불러오는 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-lg font-bold tracking-tight text-gray-900">게시글 목록</h2>
        <Link href="/board/write" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors shadow-sm">
          새 글 작성
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <input 
          type="text" 
          value={searchInput} 
          onChange={(e) => setSearchInput(e.target.value)} 
          placeholder="제목이나 내용 검색" 
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
        <input 
          type="text" 
          value={tagInput} 
          onChange={(e) => setTagInput(e.target.value)} 
          placeholder="태그 검색 (예: 회의)" 
          className="sm:w-48 rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
        <button type="submit" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium text-sm transition-colors">
          검색
        </button>
      </form>

      {error ? (
        <div className="py-10 text-center text-red-500">{error}</div>
      ) : (
        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {boards.length === 0 ? (
              <li className="p-8 text-center text-sm text-gray-500">아직 작성된 글이 없거나 검색 결과가 없습니다.</li>
            ) : (
              boards.map((board) => (
                <li key={board.id} className="hover:bg-gray-50 transition-colors">
                  <Link href={`/board/${board.id}`} className="block p-5 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-medium text-gray-900 truncate flex items-center">
                        {board.is_private && (
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        )}
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
                    <div className="mt-2 sm:flex sm:justify-between items-center">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          작성자: {board.author_nickname || `익명 ${board.user_id}`}
                        </p>
                      </div>
                      {board.tags && (
                        <div className="mt-2 sm:mt-0 flex gap-1">
                          {board.tags.split(',').map((t, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">
                              #{t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <Pagination page={page} total={total} size={10} onPageChange={setPage} />
    </div>
  );
}