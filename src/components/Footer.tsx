import { SWAGGER_URL } from "@/lib/api-client";

export default function Footer() {
  return (
    <footer className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-4">
      <div className="mx-auto max-w-[1046px] text-center text-xs text-gray-500">
        <a
          href={SWAGGER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-600 underline-offset-2 transition-colors hover:text-gray-900 hover:underline"
        >
          API 문서 (Swagger)
        </a>
      </div>
    </footer>
  );
}
