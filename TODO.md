# TODO

- [x] Replace `MemoryJudgeRepository` with a persistent DB implementation that enforces the schema in `SPECIFICATION.md`:
`users`, `teams`, `teamMembers`, `cliTokens`, `events`, `problems`, `testcases`,
`submissions`, `submissionCases`, and `solves`.
- [x] Add migrations and database-level constraints for all primary keys, foreign keys, and unique keys from the specification.
- [x] Add an admin-only flow for creating users, teams, invite codes, problems, testcase versions, and CLI tokens.
- [x] Replace the development seed token with one-time token issuance. Plain tokens must be shown only at creation time.
- [x] Add password hashing with a dedicated password KDF before enabling account login.
- Add request/response integration tests for the three judge endpoints after the test runner is selected.
- [x] Decide where the eventual standalone repository boundary should be:
keep `src/*` as the portable CLI package and `web/src/lib/judge/*` as the server-side judge core until the split.



あるていど仮実装できたので、本格実装をはじめてください。uiとか、ログインとか作ってないしね。admin, creatorの権限はauthenticatorgmail provider認証。solverはautheticatorを使わず、firestoreを使わせる。パスワード管理とかも、hashにしたやつおいておく感じで。パス
ワード忘れた場合は諦めてもらう。creatorの権限はgoogle
loginで全部通して、adminの特別認証は、google
loginの上、そのメールアドレスを.envにハードコードして認可。uiもちゃんと作って。

cliツールは、../live-cp-cliで、すでにpublish済み。
ホームは、ちゃんと作って、
イベントページで一覧、そこからイベントごとのページに飛べるようにして。
上に、ナビゲーションバーがあり、
home, eventsがあり、一番右にアカウントアイコンがあって、そこからログイン、ログアウト、アカウント設定に飛べるようにして。
eventsを開くと、またnavigationがあって、home, problems, submissions, teams, settings, setupがある感じで。setupページで、npmツールの初期化とか、イベントの初期設定のガイダンスを表示。

複数のnavigationがあるから、そのUIも、ユニークに、見やすく。

GSAPを使って、ナビゲーションのアニメーションとかも入れろ。アニメーションは、ユーザビリティを損なわない程度に、適度に入れる感じで。


creator, adminページも、ちゃんと作ってね。
権限によって、eventsの横にcreator, adminのタブが出るようにして。
creatorページでは、問題の作成、編集、削除ができるようにして。
自分が作ったもののみ、編集、削除できるようにして。
adminページでは、すべての問題の編集、ユーザ管理、イベント管理ができるようにして。すべての権限を持つ。