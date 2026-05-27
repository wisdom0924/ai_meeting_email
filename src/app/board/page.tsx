import BoardList from "@/components/board/BoardList";

export default function BoardPage() {
  return (
    <div className="w-full">
      <div className="mb-10 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">회의록 공유방 🤝</h1>
        <p className="mt-3 text-sm md:text-base text-gray-500">다른 사람들과 회의 내용을 나누고 댓글로 의견을 나눠보세요!</p>
      </div>
      <BoardList />
    </div>
  );
}