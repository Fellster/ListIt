# Security release: sharing, OCR limits, and repeatable checks

## Status and deployment order

This release changes Firestore rules and the shared-list storage format together.
Publish the rules before deploying the new application. The existing app can
still read existing shared lists, but its shared writes will be denied after the
rules are published until this release is deployed. Keep that interval short.
Do not switch an already migrated list back to the old app: it does not understand
the new item records. Existing private lists do not migrate.

1. Review the passing checks on the security pull request.
2. Publish this branch's complete `firestore.rules` file in the Firebase console
   for project `gen-lang-client-0532438240`, Firestore Database > Rules.
3. Merge the security pull request and let Vercel deploy `main`.
4. Reopen the app on each device. Test a viewer and an editor on a small shared
   list, then save an item on an existing shared list. Migration is atomic and
   preserves list/item IDs, invitations, comments and personal item order.
5. In Google AI Studio, select the project used by `GEMINI_API_KEY`. Review its
   current usage tier and billing status and set a monthly project spend cap
   appropriate for the account. This is a console setting, not an environment
   variable or a code change. Ordinary budget alerts do not enforce a spend cap.

No new API keys, service-account keys or external Redis account are needed.
The code does not change Firebase rules or billing settings automatically.

## What is enforced

- Legacy UID ownership/membership remains intact. Email-based membership and
  editing require `email_verified`. Legacy item updates cannot change `listId`.
- Only the recipient can move a pending invitation to accepted. Owners may
  update an already accepted member's role, revoke access, or send a new pending
  invitation; they cannot manufacture acceptance or undo a recipient's decline.
- New shared lists use `schemaVersion: 2`: bounded metadata and ordered item IDs
  in the parent; individual items under `listitSharedLists/{listId}/items/{id}`.
  Every item write validates its ID, title, completion boolean, allowed text
  fields and field lengths. Each item write also requires an atomic parent
  revision increment and an ID present in the parent's item order.
- Metadata is limited to known fields, list names to 120 characters and item
  IDs to 128 safe characters. A shared list may contain up to 300 items. Titles
  are limited to 2,000 characters, ingredients/instructions to 30,000 characters
  each, notes to 20,000, legacy source links to 2,048 and other text details to 256. Retired recipe detail fields remain valid so migration preserves existing data. The client also guards
  serialized item/list sizes (80 KB/item and 900 KB/list) before saving.
- The app reads existing array-based shared lists. The first owner/editor save
  or re-share migrates one existing list in a single transaction. No bulk
  migration or live-data scan runs during deployment.
- OCR allows five requests per minute and 50 per UTC day per verified account.
  Invalid requests are rejected before consuming allowance. Once a valid
  request is admitted, upstream failures still consume allowance, since they
  may incur a model charge. Two Firestore counters are claimed atomically with
  optimistic concurrency preconditions. Counter checks use the verified user's
  ID token and rules, never an administrator bypass. Counters cannot be reset,
  deleted, read by another user, or forged for a different time window.
- If the quota store is unavailable, OCR fails closed without calling Gemini.
  These per-account limits do not replace the project spend cap: many verified
  accounts can still consume additional calls. This release does not change
  App Check, headers, account deletion or other deferred review items.

## Testing and package management

Use Node 22 (or 24), Java 21 and npm. `package-lock.json` is the authoritative
lockfile; install with `npm ci`. Vercel also uses `npm ci`.

- `npm test`: offline unit tests, including OCR authentication/allowance handling.
- `npm run test:rules`: starts an isolated Firestore emulator (`demo-listit`),
  tests legacy verification, invitation consent, roles/revocation, malformed
  payloads, recipe fields, revision checks, a 300-item migration, and real REST
  quota counter writes/concurrency. No live Firebase project or Gemini calls.
- `npm run check`: TypeScript, unit tests, emulator tests, and production build.
- `npx playwright install chromium && npm run test:ui`: local browser fixtures.
  `LISTIT_TEST_CHROME=/path/to/chromium` can select an existing browser.

GitHub Actions runs the checks and browser tests on pull requests and pushes to
main without production secrets. Old `tests/redesign-smoke.cjs` targets an
archived pre-auth development route and is not part of the maintained suite.
