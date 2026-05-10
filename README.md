tailwind v3.
if you apply some animation, use GSAP, not but framer-motion.

This app is dynamic. Do not enable `output: "export"` because judge API routes require a
server runtime.

## Firebase

The judge API uses Firebase Admin SDK and Firestore collections named like the tables in
`SPECIFICATION.md`: `users`, `teams`, `cliTokens`, `events`, `problems`, `testcases`,
`submissions`, `submissionCases`, and `solves`.

Configure credentials with one of these options:

- `FIREBASE_SERVICE_ACCOUNT_KEY`: full service account JSON.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- Google Application Default Credentials.

Optional: set `FIRESTORE_DATABASE_ID` when using a non-default Firestore database.

Set `RJ_ADMIN_TOKEN` to enable the admin-only creation API. Admin requests use
`Authorization: Bearer $RJ_ADMIN_TOKEN`.

Firestore does not provide relational foreign keys, so the server enforces the specification
constraints in Firestore transactions:

- primary keys use deterministic document IDs where the specification defines a composite key
- foreign keys are checked before writes
- unique keys that are not document IDs are guarded by `_unique/*` marker documents
- `firestore.rules` denies all direct client access so writes go through the Admin SDK API

Deploy `firebase.json`, `firestore.rules`, and `firestore.indexes.json` to install the Firestore
rules and query indexes for this schema.

## Admin API

All admin endpoints are `POST` endpoints and require the admin bearer token.

- `/admin/users`: `{ "id": "demo", "password": "..." }`
- `/admin/events`: `{ "id": "rippro-2026-spring", "isActive": true, "startsAt": "2026-04-01T00:00:00.000Z" }`
- `/admin/teams`: `{ "eventId": "rippro-2026-spring", "name": "Demo Team", "adminUserId": "demo" }`
- `/admin/team-members`: `{ "teamId": "...", "userId": "demo", "role": "solver" }`
- `/admin/problems`: creates problem metadata
- `/admin/testcase-versions`: creates a complete testcase version and optionally makes it current
- `/admin/cli-tokens`: `{ "userId": "demo", "teamId": "...", "label": "laptop" }`

Plain invite codes and CLI tokens are returned only by their creation response. The database stores
only hashes.

Team member roles are `admin`, `creator`, and `solver`. CLI tokens can only be issued for `solver`
members.

For the creator-facing API that creates a problem and its testcases in one request, see
`PROBLEM_CREATION_API.md`.

## Repository Boundary

Keep future portable CLI code under `src/*` when it is independent of Next.js and Firebase. Keep the
server-side judge core under `web/src/lib/judge/*` after the split; in this repository that currently
corresponds to `src/lib/judge/*`.
