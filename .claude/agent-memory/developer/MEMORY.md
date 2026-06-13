# Developer Agent Memory

- [RAF over state for 60fps animation](feedback_raf_over_state.md) — use ref + RAF loop for scroll-driven visual sync; never write to a Jotai atom at 60fps
- [Canvas gradient over stacked translucent rects](feedback_canvas_over_stacked_rects.md) — paint chart sky gradient once on a canvas; stacked translucent SVG rects alpha-compound into seams
- [iOS viewport-fill strategy](project_ios_viewport_strategy.md) — outer fill uses %+safe-area (NOT viewport units); html owns top/side insets + carries fixed sky; viewport units unreliable at iOS 26 cold launch
