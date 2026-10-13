# ListIt redesign preview

Open `/?preview=redesign` on the branch deployment. The existing app remains at `/`.

Implemented: empty To-Do startup, list tabs, Personal/Work template picker, editable list names, explicit item Save/Cancel, completed section, delete undo, local filtering/sorting, default and per-list themes, voice review, OCR review through the existing server, Google Calendar event composer, and Apple/Outlook ICS export.

Preview storage is isolated localStorage (`listit_redesign_preview_v1`), not Firebase. Do not enter sensitive or irreplaceable data. Existing lists are not migrated. Sharing UI is disabled; no invitations are sent.

Next: Firebase identity and authoritative persistence; invitation acceptance and Viewer/Commenter/Editor security rules; item comments; per-user theme/view preferences; Vercel OCR endpoint authentication and deployment wiring; migration and revocation tests; custom theme colors/fonts and device appearance.

Validation: TypeScript and production build; default-list and calendar rollover/escaping validation passed. Browser smoke script provided in tests/redesign-smoke.cjs, but not executed successfully here because Chromium is unavailable. Microphone/OCR/calendar import require device testing.

Run `npm install`, `npm run dev`, then open the preview. Browser smoke test requires Playwright and Chromium and a server at port 3000.
