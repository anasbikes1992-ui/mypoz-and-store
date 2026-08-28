# Phase G — Offline POS (IndexedDB)

**Status:** IMPLEMENTED (flag off by default)

## Delivered

| Item | Path |
|------|------|
| IndexedDB queue + legacy migration | `offline-queue.ts` |
| Client UUID on flush | `clientUuid` in queue item |
| Feature flag | `NEXT_PUBLIC_ALLOW_OFFLINE_POS=true` |

## Verify (pilot only)

1. Enable flag locally.
2. Disconnect network, complete sale → queued.
3. Reconnect → `flushOfflineSales` posts to `/api/sales`.

**Production:** keep flag `false` until operator certifies pilot.
