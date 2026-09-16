---
title: "Story 5.4: Alert Notifications — Push and Email"
epic: "Epic 5 — Watchlist, Alerts, and Notifications"
story_id: "5.4"
status: done
created: 2026-09-16
updated: 2026-09-16
author: Bob (BMAD Scrum Master) & Amelia (BMAD Developer)
based_on: ["docs/PRD.en.md", "docs/architecture.en.md", "docs/epics.en.md §9"]
language: en
translationOf: docs/stories/story-5.4.md
depends_on: ["5.2", "5.3"]
---

# Story 5.4: Alert Notifications — Push and Email

*This is the English translation of [`docs/stories/story-5.4.md`](story-5.4.md), which remains the source of truth.*

## User Story

As a **user**,
I want to get a push notification and/or email when an alert triggers,
So that I'm notified without keeping the app open.

*(Source: `docs/epics.md` §9, Epic 5 — Story 5.4; PRD FR-043, FR-070.)*

## Context

Story 5.2/5.3 only updated an alert's trigger status when the user **opened** `/alerts` or `/signal-alerts` (on-read evaluation, no Celery/background job — see Story 5.2's architectural rationale). This story reuses that exact evaluation moment as the **notification-send moment**: the instant an alert transitions from `active` to `triggered` (i.e. inside `evaluate_and_persist`), a push/email notification is also sent within the same request.

**What this means, and an honest limitation:** if the user never opens the app at all (neither web nor mobile, and no request happens in the background), the trigger is never evaluated, so no notification is ever sent — because there's no real background scheduler/worker (a limitation already noted in Story 5.2, consistent with the PRD's architectural constraints). This story solves "get notified instantly whenever the user (or anyone) happens to make a triggering request"; "keep monitoring in the background even if the app is never opened" would require Celery/cron and conflicts with the architecture's "few moving parts" principle — it's out of scope here and would need its own architecture decision if pursued later.

**A new design decision (a deliberate departure from Story 1.3, with rationale):** Story 1.3 resolved the language preference through Supabase `user_metadata` (carried as a JWT claim). For this story, the push token/notification preference is kept in **a new Postgres table** (`user_notification_settings`) instead — `user_metadata` is **not** used. Reason: `user_metadata` is a snapshot taken **at the moment the JWT was issued** (typically up to ~1 hour stale); if a user grants push permission and registers their token, the backend would only see it once the user's JWT refreshes — a confusing "I just granted permission but the backend still sees the old token" lag. Reading/writing directly to Postgres (consistent with AD-3, the same pattern as Story 5.1/5.2/5.3) removes this lag entirely.

## Scope

**Completed in this PR:**
- **DB:** `apps/api/migrations/0004_notification_settings.sql` — the `user_notification_settings` table (applied to live Supabase).
- **Backend:** `app/notifications.py` (settings CRUD + Expo push sending + Resend email sending + `notify_trigger` — fault-tolerant, never breaks the calling request), `user_id`/`email` parameters added to `app/alerts.py`'s and `app/signal_alerts.py`'s `evaluate_and_persist` functions with a `notify_trigger` call wired in on trigger, `/notification-settings` (GET/PUT) endpoints.
- **Web:** a "Notifications" card on the `/settings` page (email toggle only — push is already mobile-specific per FR-043).
- **Mobile:** email + push toggles on `SettingsScreen`; permission request and token registration for push via `expo-notifications` (`lib/push-notifications.ts`).
- **i18n:** notification-preference strings added to `Messages.settings` (tr/en).

**Out of scope (deliberate, with rationale):**
- **Actually sending and seeing a real push notification on a device** — as of Expo SDK 53+, **remote push notifications no longer work inside Expo Go**; a **development build** (`expo-dev-client`/EAS) and linking the project to an EAS project via `eas init` (populating `app.json`'s `expo.extra.eas.projectId`) are required — this repo hasn't been through that setup yet. This is **the same category** of limitation as the native Google/Apple OAuth gap in Story 1.2. The code is written correctly per current Expo documentation (`registerForPushNotificationsAsync` — request permission, create a channel, get a token) and compiles cleanly in the Metro bundle, but actually obtaining a real token and delivering a notification to a device could not be tested in this environment.
- Continuous background monitoring (detecting a trigger even if the user never makes a request) — rationale above, would require Celery/cron.
- A notification history/inbox (only instant delivery exists; there's no screen listing past notifications).

## Tasks

1. **[DB]** `user_notification_settings` schema + migration (same pattern as Story 5.1–5.3). ✅
2. **[Backend]** `app/notifications.py`: settings data layer (get/upsert) + `send_expo_push` + `send_email` (Resend, gracefully returns `False` without `RESEND_API_KEY`) + `notify_trigger` (a fault-tolerant wrapper). ✅
3. **[Backend]** `user_id`/`email` parameters added to `app/alerts.py`'s and `app/signal_alerts.py`'s `evaluate_and_persist`; `main.py`'s `GET /alerts` and `GET /signal-alerts` pass these through from `claims`. ✅
4. **[Backend]** `/notification-settings` GET/PUT endpoints; `PUT` added to CORS. ✅
5. **[Backend]** Tests: settings CRUD, `send_expo_push`/`send_email` (mocked HTTP), `notify_trigger` (including that it never raises), endpoint tests. ✅
6. **[Web]** `lib/notification-settings-client.ts`; an email-notification card on `/settings`. ✅
7. **[Mobile]** `expo-notifications`/`expo-device`/`expo-constants` installed; `lib/push-notifications.ts`, `lib/notification-settings-client.ts`; a push+email card on `SettingsScreen`. ✅
8. **[All]** Notification strings added to `Messages.settings` (tr/en); `RESEND_API_KEY`/`NOTIFICATION_FROM_EMAIL` added to `apps/api/.env.example`. ✅

## Acceptance Criteria

**AC1 — Push notification (verified at the code level, not on a device)**
- **Given** a user has granted push permission in the mobile app and has a registered Expo push token, **When** one of their alerts triggers, **Then** the backend sends an Expo push request to that token (FR-043, FR-070). *(Actual device delivery could not be verified in this environment due to the Expo Go/EAS constraint above; live testing confirmed a real request was sent and the response was handled fault-tolerantly.)*

**AC2 — Email notification**
- **Given** the user has left email notifications on, **When** an alert triggers, **Then** an email send via Resend is attempted (gracefully skipped without raising if `RESEND_API_KEY` isn't configured).

**AC3 — Notification preferences**
- **And** the user can toggle push/email preferences from the settings screen (web: email only; mobile: both); the preference is persisted in the `user_notification_settings` table.

## Definition of Done

- [x] AC1–AC3 met and verified (backend: pytest 174/174 green + ruff clean; web: typecheck/lint/build; mobile: typecheck/lint + Metro bundle [919 modules] green).
- [x] Migration applied to live Supabase, verified.
- [x] No endpoint crashes without `RESEND_API_KEY` — email is silently skipped.
- [x] **Live end-to-end verified (at the push-send-request level):** with a real user JWT, `PUT /notification-settings` (registering a fake Expo token) → `POST /alerts` (a threshold that triggers immediately) → `GET /alerts` (triggered + an Expo push request was attempted in the background, its failure swallowed without raising, the main response still returned 200) → cleanup.
- [ ] Receiving a push notification on a real device — not possible in this environment due to the EAS/dev-client constraint above; the user should try this after running `eas init` and building a development build.

## Technical Notes

- **A new table instead of `user_metadata` (rationale above):** this deliberately does not follow Story 1.3's pattern, because the freshness requirement is different here.
- The Expo push endpoint (`https://exp.host/--/api/v2/push/send`) doesn't require an API key — only the recipient's push token — so the "gracefully skip if missing" pattern used for `FINNHUB_API_KEY`/`RESEND_API_KEY` doesn't apply on the push side; only whether a token exists is checked.
- `notify_trigger` is called from inside `evaluate_and_persist` and **never raises** — a notification-delivery failure must never break the API response for an alert that's already been persisted as `triggered` in the database.
- On mobile, push-token registration will currently return `null` because the `projectId` that `getExpoPushTokenAsync` needs (`app.json` → `expo.extra.eas.projectId`) hasn't been set up in this repo yet — this is expected behavior until `eas init` is run, not a bug.
