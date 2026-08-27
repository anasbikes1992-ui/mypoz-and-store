# 10 — Knowledge & approvals

**Status:** PASS WITH NOTES — 2026-08-27  
**Rule:** Tenant knowledge + Approval Center. Agents propose; humans approve.  
**Reference tenant:** **Anaz Store** (`anaz-store`, org `304adc33-7279-4547-a73d-a2240333e814`, Business plan, 1518 products).

## Shipped

### Knowledge
- `/knowledge` + `/api/knowledge` — CRUD + harvest (Business+ / HQ extra)
- **Auth:** `requireTenantSession` on knowledge APIs
- Anaz seeded with 2 policy articles (`TKB-anaz-cod`, `TKB-anaz-storefront`) in `app_collections`

### Approval Center
- `/approvals` + `/api/approvals` (+ `[id]` decide)
- Kinds: `kb_article_draft`, `wa_outbound_draft`
- Persist: `agent-approvals` collection (same Supabase + `org_id`)
- Jarvis tools: `propose_kb_article`, `propose_wa_message` → pending only
- Approve executes create KB / send WA; reject stores reason
- Module tile `approvals` on Starter+

## Notes
- No autonomous writes — still no stock adjust / order fulfill tools
- PDF/RAG upload not in scope
- Next: real-client checklist on Anaz (`11`)
