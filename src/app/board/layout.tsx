import Header from "@/components/Header";

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans w-full">
      <Header />
      <main className="flex-1 w-full max-w-[1046px] mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
