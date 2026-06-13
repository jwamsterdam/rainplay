import { useLayoutEffect, useRef, useState } from "react";

// Measures an element's content rect via ResizeObserver and returns a stable
// [ref, { width, height }] tuple. Avoids ResponsiveContainer's mount-time
// measurement race (the "width(-1)" warning and occasional collapsed-width
// render under StrictMode's double render).
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
