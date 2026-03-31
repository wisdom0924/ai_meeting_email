export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <div className="text-2xl">🎙️</div>
        <h1 className="text-xl font-bold text-primary">AI 회의록 마법사</h1>
      </div>
      <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
        <span className="text-xl">⚙️</span>
      </button>
    </header>
  );
}
