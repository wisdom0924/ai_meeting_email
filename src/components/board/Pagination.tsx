"use client";

import Link from "next/link";

interface PaginationProps {
  page: number;
  total: number;
  size: number;
  onPageChange?: (newPage: number) => void;
  baseUrl?: string;
}

export default function Pagination({ page, total, size, onPageChange, baseUrl }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {page > 1 && (
        baseUrl ? (
          <Link href={`${baseUrl}?page=${page - 1}`} className="px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
            이전
          </Link>
        ) : (
          <button onClick={() => onPageChange?.(page - 1)} className="px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
            이전
          </button>
        )
      )}

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
        const isCurrent = p === page;
        const baseClasses = "px-3.5 py-2 text-sm font-medium rounded-lg transition-colors";
        const currentClasses = "bg-gray-900 text-white shadow-sm";
        const defaultClasses = "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900";
        
        if (baseUrl) {
          return (
            <Link
              key={p}
              href={`${baseUrl}?page=${p}`}
              className={`${baseClasses} ${isCurrent ? currentClasses : defaultClasses}`}
            >
              {p}
            </Link>
          );
        }
        return (
          <button
            key={p}
            onClick={() => onPageChange?.(p)}
            className={`${baseClasses} ${isCurrent ? currentClasses : defaultClasses}`}
          >
            {p}
          </button>
        );
      })}

      {page < totalPages && (
        baseUrl ? (
          <Link href={`${baseUrl}?page=${page + 1}`} className="px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
            다음
          </Link>
        ) : (
          <button onClick={() => onPageChange?.(page + 1)} className="px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
            다음
          </button>
        )
      )}
    </div>
  );
}