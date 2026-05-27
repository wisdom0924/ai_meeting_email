"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBoard, updateBoard, fetchBoard } from "@/lib/board-api";

export default function BoardWrite({ editId }: { editId?: number }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [tags, setTags] = useState("");
  
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
          setIsPrivate(data.is_private || false);
          setTags(data.tags || "");
          setLoading(false);
        })
        .catch((err) => {
          alert("게시글을 불러오지 못했습니다.");
          router.push("/board");
        });
    } else {
      // 작성 모드일 때, 세션 스토리지에 공유할 데이터가 있는지 확인
      const shareDataStr = sessionStorage.getItem("share_board_data");
      if (shareDataStr) {
        try {
          const shareData = JSON.parse(shareDataStr);
          setTitle(shareData.title || "");
          setContent(shareData.content || "");
          
          // 태그 기본값 설정
          setTags("회의록");
          
          // 사용 후 삭제 (새로고침시 다시 안 불러오게)
          sessionStorage.removeItem("share_board_data");
        } catch (e) {
          console.error("공유 데이터 파싱 에러:", e);
        }
      }
    }
  }, [editId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    if (isPrivate && !editId && !password.trim()) {
      alert("비밀글 설정 시 비밀번호를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        // 수정 시에는 비밀번호를 비워두면 기존 비밀번호 유지, 값이 있으면 변경
        await updateBoard(editId, title, content, null, isPrivate, password.trim() ? password : undefined, tags);
        alert("수정되었습니다.");
        router.push(`/board/${editId}`);
      } else {
        const created = await createBoard(title, content, null, isPrivate, password, tags);
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
          <label className="text-sm font-medium text-gray-700">태그</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none ring-gray-900/10 focus:border-gray-900 focus:ring-2 transition-all"
            placeholder="태그를 쉼표(,)로 구분해서 입력하세요 (예: 회의, 마케팅)"
          />
        </div>
        
        <div className="flex flex-col gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
            />
            <span className="text-sm font-medium text-gray-700">비밀글로 설정</span>
          </label>
          
          {isPrivate && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">비밀번호 {editId ? "(변경 시에만 입력)" : "(필수)"}</label>
              <input
                type="password"
                required={!editId}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none ring-gray-900/10 focus:border-gray-900 focus:ring-2 transition-all"
                placeholder="비밀번호를 입력하세요"
              />
            </div>
          )}
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