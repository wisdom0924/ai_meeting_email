"use client";

import { useLayoutEffect, useRef, type ComponentPropsWithoutRef } from "react";

/** 안쪽 스크롤·리사이즈 없이 줄 수만큼 높이 확장 (페이지는 바깥 한 번만 스크롤) */
export default function AutosizeTextarea({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const value = props.value ?? "";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "1px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      {...props}
      className={`${className} resize-none overflow-hidden`}
    />
  );
}
