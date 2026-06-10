# Test Engineer Memory

- [Project test stack setup](feedback_vitest_setup.md) — Vitest + jsdom + Testing Library installed; scrollend/scrollTo jsdom quirks documented
- [jsdom scroll behavior quirks](feedback_jsdom_scroll_quirks.md) — "onscrollend" in window is TRUE in Vitest jsdom; div.scrollTo is undefined
- [RAF loop testing pattern](feedback_raf_testing.md) — Perpetual RAF loops break vi.runAllTimers(); use manual spy + flushRaf() pattern instead
