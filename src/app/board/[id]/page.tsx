"use client";

import BoardDetail from "@/components/board/BoardDetail";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function BoardDetailPage() {
  const params = useParams();
  const [boardId, setBoardId] = useState<number | null>(null);
  
  useEffect(() => {
    console.log("useParams return value:", params);
    if (params && params.id) {
      setBoardId(parseInt(params.id as string, 10));
    }
  }, [params]);
  
  if (boardId === null) {
    return <div className="text-center py-10">로딩 중...</div>;
  }

  if (isNaN(boardId)) {
    return (
      <div className="text-center py-10">
        잘못된 게시글 주소입니다. (주소값: {JSON.stringify(params)})
      </div>
    );
  }

  return (
    <div className="w-full">
      <BoardDetail id={boardId} />
    </div>
  );
}