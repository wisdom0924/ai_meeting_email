"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBoard, updateBoard, fetchBoard } from "@/lib/board-api";

export default function BoardWrite({ editId }: { editId?: number }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    if (editId) {
      fetchBoard(editId)
        .then((data) => {
          setTitle(data.title);
          setContent(data.content);
          setLoading(false);
        })
        .catch((err) => {
          alert("게시글을 불러오지 못했습니다.");
          router.push("/board");
        });
    }
  }, [editId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      if (editId) {
        await updateBoard(editId, title, content);
        alert("수정되었습니다.");
        router.push(`/board/${editId}`);
      } else {
        const created = await createBoard(title, content);
        console.log("새로 작성된 게시글:", created);
        alert("작성되었습니다.");
        router.push(`/board`);
      }
    } catch (err: any) {
      alert(err.message || "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-10 text-center">불러오는 중...</div>;

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-6">
        {editId ? "게시글 수정" : "새 게시글 작성"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">제목</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none ring-gray-900/10 focus:border-gray-900 focus:ring-2 transition-all"
            placeholder="제목을 입력하세요"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">내용</label>
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none ring-gray-900/10 focus:border-gray-900 focus:ring-2 transition-all min-h-[300px] resize-y"
            placeholder="내용을 자유롭게 입력하세요"
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors text-sm"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors disabled:opacity-50 text-sm shadow-sm"
          >
            {submitting ? "처리 중..." : (editId ? "수정 완료" : "작성 완료")}
          </button>
        </div>
      </form>
    </div>
  );
}