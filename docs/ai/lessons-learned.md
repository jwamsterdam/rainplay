# Lessons Learned

## Accepted lessons
These are binding project rules.

### 2026-06-08 - Keep chart state outside visual components
When adding chart interactions, keep visibility/filter state in a parent hook or store. Chart primitives should receive derived props and not own cross-widget state.

## Candidate lessons
These are proposals. Do not treat them as binding until accepted.

### Candidate - Prefer component tests for interactive chart toggles
Reason: checkbox-driven chart visibility is user-visible behavior and easy to regress.
Status: pending review.

## Rejected or superseded lessons
Keep short notes here when an earlier lesson is no longer valid.