# ListIt redesign preview

Open `/?preview=redesign` on the branch deployment. The existing app remains at `/`.

Implemented: empty To-Do startup, list tabs, Personal/Work template picker, editable list names, explicit item Save/Cancel, completed section, delete undo, local filtering/sorting, default and per-list themes, voice review, OCR review through the existing server, Google Calendar event composer, and Apple/Outlook ICS export.

Preview storage is isolated localStorage (`listit_redesign_preview_v1`), not Firebase. Do not enter sensitive or irreplaceable data. Existing lists are not migrated. Sharing UI is disabled; no invitations are sent.

Next: Firebase identity and authoritative persistence; invitation acceptance and Viewer/Commenter/Editor security rules; item comments; per-user theme/view preferences; Vercel OCR endpoint authentication and deployment wiring; migration and revocation tests; custom theme colors/fonts and device appearance.

Validation: TypeScript and production build; default-list and calendar rollover/escaping validation passed. Browser smoke script provided in tests/redesign-smoke.cjs, but not executed successfully here because Chromium is unavailable. Microphone/OCR/calendar import require device testing.

Run `npm install`, `npm run dev`, then open the preview. Browser smoke test requires Playwright and Chromium and a server at port 3000.

Personal and Work navigation now shows only the selected group’s lists. Settings includes an Open app in preference. First use still has one Personal To-Do list; Work starts empty. The preference persists locally and is applied on reload.

## Account storage stage
The preview now requires Firebase email/password or Google sign-in. Redesigned lists and preferences are stored in the signed-in user document under listitRedesign, with a listitRevision transaction guard. Existing profile fields and original app collections are preserved. The existing /users/{uid} rule is owner-only; no live rules were deployed. Sharing remains disabled. Local-only preview data is retained in the browser but not automatically imported into any account. A transaction conflict leaves edits in the current page and blocks overwrite; reload explicitly discards unsaved edits. Save status and retry are shown.

Cross-account isolation, Firebase provider configuration, preview authorized domains, password resets, cross-device updates, network recovery and conflicts require live testing before merging. The prior browser smoke script targets the former local-only preview and must be adapted for authenticated fixtures.

## Sharing stage
New collections: listitSharedLists and listitInvitations, plus per-list comments subcollections. Publish the repository firestore.rules in the same Firebase project before testing sharing. Existing rules are preserved; new rules require verified emails for invitation recipients. A list is promoted into a separate shared record on its first invitation. Its old private entry becomes a disabled pointer; owners and accepted recipients open it in Shared lists below. Full integration of shared tabs with Personal/Work is a follow-up. Invitations are links delivered manually; no email provider is configured and no email is automatically sent. Owner can change roles and revoke; pending recipients cannot read list contents; viewer can read, commenter can comment, editor can edit contents; only owner can delete the shared record. Comments appear in the shared view with item labels. Comments are not yet editable/deletable in the UI. Shared theme defaults are currently owner-controlled; independent recipient theme preferences remain a follow-up.

Rules test: npm install --no-save @firebase/rules-unit-testing@5 firebase-tools@14; npx firebase emulators:exec --project demo-listit --config firebase.sharing-test.json --only firestore 'node tests/sharing-rules.mjs'. Never deploy rules until the tests pass.

Validation: Firestore emulator rules tests passed for pending access, verified email, Viewer/Commenter/Editor roles, ownership, revocation and self role escalation. Invitation acceptance expires after seven days. Email delivery is manual via copied links.

## Unified shared tabs
Shared records now replace private pointers in the ordinary Personal/Work tabs. Accepted lists appear alongside private lists. Group, theme and font choices are stored in each user profile, independent of shared contents. The Share panel has a compact participant line with names captured at acceptance and email fallback; accepted members may read only accepted roster entries. Comments appear in expanded item details. Recipients can leave a list; owners can delete it. Updated firestore.rules must be published to enable participant roster reads and recipient names/leave operations.

## Vercel OCR endpoint
api/ocr-scan.ts serves POST /api/ocr-scan on Vercel and is reused by server.ts for local development. It verifies Firebase ID tokens for this project, requires a verified non-anonymous account, validates image type and size, and transcribes one line per item. Set GEMINI_API_KEY as a server environment variable for Vercel Preview and Production. Optional GEMINI_OCR_MODEL overrides the default gemini-3.5-flash-lite. Never prefix this key with VITE_. Redeploy after changing environment variables. Client sends its Firebase bearer token and already compresses the photo.

Validation: TypeScript/build and tests/ocr-handler.mjs pass (mocked model and identity verification). Actual Gemini scanning still needs a configured key and live photo test.
