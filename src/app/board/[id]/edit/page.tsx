"use client";

import BoardWrite from "@/components/board/BoardWrite";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function BoardEditPage() {
  const params = useParams();
  const [boardId, setBoardId] = useState<number | null>(null);

  useEffect(() => {
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
        잘못된 게시글 주소입니다.
      </div>
    );
  }

  return (
    <div className="w-full">
      <BoardWrite editId={boardId} />
    </div>
  );
}