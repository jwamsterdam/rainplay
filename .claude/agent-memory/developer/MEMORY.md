# Developer Agent Memory

- [RAF over state for 60fps animation](feedback_raf_over_state.md) — use ref + RAF loop for scroll-driven visual sync; never write to a Jotai atom at 60fps
- [Canvas gradient over stacked translucent rects](feedback_canvas_over_stacked_rects.md) — paint chart sky gradient once on a canvas; stacked translucent SVG rects alpha-compound into seams
- [iOS viewport-fill strategy](project_ios_viewport_strategy.md) — .app-shell uses over-fill-and-clip (min-height 100svh + height 100lvh); don't reintroduce dvh/position:fixed/JS innerHeight
