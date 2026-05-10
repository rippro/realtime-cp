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
