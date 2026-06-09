import BoardList from "@/components/board/BoardList";
import BoardPageHeader from "@/components/board/BoardPageHeader";

export default function BoardPage() {
  return (
    <div className="w-full">
      <BoardPageHeader />
      <BoardList />
    </div>
  );
}
