# Phase J — Vertical workflows

**Status:** IMPLEMENTED (repair un-quarantined)

## Delivered

| Item | Change |
|------|--------|
| Repair vertical | `modules.ts` status `active` |
| Plan gating | removed `repair` from `QUARANTINED_VERTICAL_KEYS` |

## Verify

1. Enterprise tenant sees Repair tile on launcher.
2. `/repair` loads job workflow.

Other quarantined verticals (rooms, rent, hire) remain `soon`.
