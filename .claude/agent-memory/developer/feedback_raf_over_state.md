---
name: feedback_raf_over_state
description: For high-frequency visual sync (60fps scroll-driven animation), use a ref + RAF loop instead of Jotai atoms or React state to avoid per-frame re-renders on all subscribers.
metadata:
  type: feedback
---

Use a `useRef<number>` written by a scroll callback and read inside a `requestAnimationFrame` loop in the animated component. Never write to a Jotai atom inside a scroll event handler that fires at 60fps.

**Why:** Writing to a Jotai atom per scroll frame triggers re-renders on all atom subscribers across the component tree. A ref mutation + RAF loop is zero-render and composable.

**How to apply:** When a visual element needs to track a continuous scroll position in real time (e.g. a sliding indicator), wire it via `scrollFractionRef = useRef<number>(0)`, a `useCallback` setter passed as a prop, and a RAF loop that reads `ref.current` and writes `element.style.transform` directly.
