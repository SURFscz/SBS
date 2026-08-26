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
