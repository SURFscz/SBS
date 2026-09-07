# Collaboration detail (local)

Local component flow for a collaboration member who has a single collaboration.

Uses the seeded user `urn:collab:person:mujina.com:ebbe` (member of **AI computing**) via the
`mockUser` Playwright fixture (route interception of `PUT /api/mock`).

## Coverage

1. Home redirects to `/collaborations/:id` (id is not hard-coded)
2. About — Network Services card with Open button
3. Members — one Admin/Beheerder (The Boss), read-only Member chips, current user (Ebbe) marked You
4. Groups — non-empty list (AI researchers, AI developers)
5. Application tokens — Create opens the new-token form

Requires the frontend and backend with seed data and `ALLOW_MOCK_USER_API=1`.

## Collaboration detail (platform admin)

`collaborationPlatformAdmin.spec.ts` covers the same **AI computing** collaboration through the full admin view,
using `DEFAULT_MOCK_USER` (`urn:john`, a platform admin).

Implemented:

1. Home shows the platform admin dashboard instead of redirecting to a collaboration
2. Collaborations overview — all 6 seeded collaborations, John is a member of AI computing only
3. Full admin tab set (7 tabs) with notifiers on join requests and applications
4. About — organisation and unit in the header, description, 2 connected services, tags, short name,
   website link and the admin to contact
5. About — expandable service card sections: policies, support fallbacks and the lazily fetched
   application groups
6. Admins — The Boss as the only CO admin, editable role, no group filter, and the invite action
7. Admins — the single open admin invitation, its status chip and resend action; accepted and expired
   invitations are already stripped by the backend
8. Members — 6 memberships plus the open invitation, editable roles, the You marker, the group filter,
   the 'hide invitations' checkbox and the invite action
9. Groups — both seeded groups with descriptions, member counts, auto provisioning, the admin-only
   columns and the inline add-group form
10. New group form — field set, derived platform identifier, no delete action, cancel back to the list
11. Applications — the connected list: 2 connected applications plus the open connection request for Storage
    with its pending chip and requester message, the disconnect confirmation and the search filter
12. Applications — the available list: the 7 applications AI computing may still connect to, and connect
    versus request depending on `automatic_connection_allowed`
13. Join requests — the 3 open requests with requester, email and status, and the approve/deny form of
    one of them including the reason the backend asks for before denying
14. Application tokens — the list starts at 0, creating one fetches a generated value from the backend and
    prefills the form, with Network Services as the only `token_enabled` application

All admin cases are read-only: confirmation dialogs and forms are opened and then cancelled, so the suite
needs only the single reseed in `beforeAll`.
