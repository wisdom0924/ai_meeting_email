"use client";

import { useEffect, useState } from "react";
import { fetchComments, createComment, deleteComment, updateComment, Comment } from "@/lib/board-api";

export default function CommentArea({ boardId }: { boardId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // 수정 관련 상태
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (id) setCurrentUserId(parseInt(id, 10));

    async function loadComments() {
      try {
        const data = await fetchComments(boardId);
        setComments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadComments();
  }, [boardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const created = await createComment(boardId, newComment);
      setComments((prev) => [...prev, created]);
      setNewComment("");
    } catch (err) {
      alert("댓글 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm("정말 댓글을 삭제할까요?")) return;

    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert("댓글 삭제에 실패했습니다.");
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleUpdate = async (commentId: number) => {
    if (!editContent.trim()) return;
    
    try {
      const updated = await updateComment(commentId, editContent);
      setComments((prev) => prev.map((c) => c.id === commentId ? updated : c));
      setEditingCommentId(null);
      setEditContent("");
    } catch (err) {
      alert("댓글 수정에 실패했습니다.");
    }
  };

  if (loading) return <div className="text-gray-500 text-sm mt-8">댓글을 불러오는 중...</div>;

  return (
    <div className="mt-10 pt-8 border-t border-gray-100">
      <h3 className="text-lg font-bold tracking-tight text-gray-900 mb-6">댓글 ({comments.length})</h3>
      
      <ul className="space-y-4 mb-8">
        {comments.map((comment) => (
          <li key={comment.id} className="bg-gray-50 p-5 rounded-xl border border-gray-100">
            <div className="flex justify-between items-start mb-3">
              <div className="text-sm font-bold text-gray-900">{comment.author_nickname || `익명 ${comment.user_id}`}</div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {new Date(comment.created_at).toLocaleString()}
                  {comment.updated_at && " (수정됨)"}
                </span>
                {currentUserId === comment.user_id && editingCommentId !== comment.id && (
                  <>
                    <button
                      onClick={() => startEditing(comment)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {editingCommentId === comment.id ? (
              <div className="flex flex-col gap-3 mt-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-gray-900/10 focus:border-gray-900 focus:ring-2 transition-all bg-white"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleUpdate(comment.id)}
                    disabled={!editContent.trim()}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium text-sm transition-colors shadow-sm"
                  >
                    수정 완료
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{comment.content}</p>
            )}
          </li>
        ))}
      </ul>

      {currentUserId ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 남겨보세요..."
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-gray-900/10 focus:border-gray-900 focus:ring-2 transition-all"
            rows={3}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium text-sm transition-colors shadow-sm"
            >
              등록
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-gray-50 border border-gray-100 p-6 text-center rounded-xl text-sm text-gray-500">
          댓글을 작성하려면 로그인이 필요합니다.
        </div>
      )}
    </div>
  );
}