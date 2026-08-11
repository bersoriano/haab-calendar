# Guest Booking Page Builder Design

## Goal

Let a first-time visitor build and preview a real booking page without an account. Require email-and-password account creation only when the visitor chooses to publish. Preserve every guest edit through signup, email confirmation, sign-in, and publish errors.

## Approved product decision

- Anonymous visitors can use the complete setup experience.
- They can choose a business type, name the page, edit seeded services, add services, edit business details and availability, and inspect the real public-page preview.
- Account creation is not shown during setup.
- Publishing is the first account gate.
- Authentication stays email plus password.
- Account creation is the primary auth action for this flow. Sign in remains available for returning users.

## Success criteria

A first-time visitor can:

1. Start from any Create CTA.
2. Build a useful booking page without authentication.
3. Preview the page using the same component and data shape used by the public experience.
4. Choose Publish.
5. Create an account or sign in without losing the draft.
6. Return from email confirmation or sign-in.
7. Save the draft to the account and publish it.
8. Open or share the resulting public page.

No anonymous path redirects to `/login` before Publish.

## Entry behavior

All generic Create CTAs use one shared `startGuestBuilder` action:

- Header Create button
- Hero Create button
- Closing CTA
- Footer CTA

That action opens the builder directly. It does not scroll the landing page and does not open authentication.

Business-type cards use the same action with a preselected vertical. For example, Healthcare begins the builder with `healthcare` selected. It does not redirect to authentication.

The explicit Sign in link stays separate for returning users.

## Screen-by-screen flow

### 1. Basics

Purpose: create the first meaningful draft.

Show:

- Business-type selection
- Page or business name
- Provisional public URL
- “Draft saved in this browser” status

Selecting a vertical seeds its existing services, availability, terminology, and booking rules. Naming the page updates the provisional slug immediately.

Primary action: `Continue to services`.

### 2. Services

Purpose: let the visitor shape what clients can book.

Show the vertical's seeded services as editable cards. Support:

- Rename
- Description
- Booking type
- Duration
- Price
- Capacity
- Delete
- Add service

Require at least one valid service before continuing. Keep validation inline and preserve all valid fields after an error.

Primary action: `Continue to availability`.

### 3. Business details and availability

Purpose: complete data required for a credible preview.

Show:

- Provider or organizer name
- Business name
- Public contact details already supported by the product
- Location details already supported by the selected vertical
- Seeded weekly availability
- Booking length and blocked-window controls already supported by setup

Any public contact email is optional and labeled as information clients may see. It is distinct from the private account email requested at Publish. Account credentials belong only to the publish gate.

Primary action: `Preview my page`.

### 4. Public-page preview

Purpose: deliver value before commitment.

Render the real public booking-page shell from the guest draft. Do not build a separate visual approximation. Let the visitor inspect services, dates, times, terminology, and responsive layout.

Label the state clearly: `Preview — not published yet`.

Client booking confirmation stays disabled because the page is not public. Preview interactions may change local UI state but must not create server holds or bookings.

Actions:

- Primary: `Publish my page`
- Secondary: `Continue editing`

### 5. Account gate

Publish opens a focused account-creation panel while keeping the draft context visible.

Heading: `Create your account to publish {business name}`

Reassurance: `Everything you entered is safe. Create an account to save your page and publish it.`

Fields:

- Email
- Password
- Show or hide password

Primary action: `Create account to publish`

Secondary action: `Already have an account? Sign in`

Do not render Create account and Sign in as equal buttons. Signup owns primary visual hierarchy when entered from Publish.

Closing or backing out returns to preview with the complete draft intact.

### 6. Email confirmation

If Supabase returns an authenticated session immediately, continue directly to draft migration and publish.

If email confirmation is required, show a confirmation state tied to the draft:

- `Check your email to publish {business name}`
- Entered email address
- `Your draft is safe in this browser`
- Resend confirmation
- Change email
- Return to preview

The confirmation link must return to the builder's publish-resume state. Existing `/auth/confirm` code can establish the session from a code or token and redirect to a safe `next` path. Successful confirmation must not require credentials again when a session was established.

### 7. Migration and publish

After authentication:

1. Read the latest guest draft.
2. Validate it again using the same rules as the builder.
3. Persist it to the authenticated provider store.
4. Mark setup complete and publish only after server persistence succeeds.
5. Replace local IDs with returned server-backed IDs.
6. Clear the guest draft only after successful persistence.

Show an in-context progress state: `Saving and publishing your page…`.

### 8. Success

Show:

- `Your booking page is live`
- Public URL
- Copy link
- Open public page
- QR code, when available
- Go to dashboard

## Guest draft model

Use a versioned local draft stored on the same origin. Draft contains the existing `ModuleStore` setup data plus lightweight metadata:

```ts
type GuestBuilderDraft = {
  version: 1;
  updatedAt: string;
  currentStep: "basics" | "services" | "availability" | "preview" | "publish";
  localAssetKeys: string[];
  store: ModuleStore;
};
```

Rules:

- Autosave after meaningful changes.
- Restore after refresh, back navigation, auth errors, and confirmation round trips.
- Debounce storage writes; do not announce every keystroke.
- State clearly that pre-account drafts exist only in this browser.
- Keep draft until successful account persistence or explicit user reset.
- Never store passwords or auth tokens with the draft.

## Existing-user behavior

If a visitor chooses Sign in from the publish gate:

- Preserve the guest draft.
- After successful sign-in, resume the publish flow.
- If the account has no configured page, attach and publish the draft.
- If the account already has a page, never overwrite automatically.

Existing-page conflict screen:

- Primary: `Open my existing page`
- Destructive secondary: `Replace it with this draft`
- Replacement requires explicit confirmation and explains what will change.

## Slug behavior

Guest preview URL is provisional. Do not reserve public slugs anonymously.

At publish:

- Normalize the requested slug.
- Check availability on the server.
- If occupied, offer a close alternative and keep the rest of the draft unchanged.
- Publish only after the visitor accepts an available slug.

## Image behavior

Current server image upload requires authentication. Guest builder must still support image experimentation before signup.

- Store guest image blobs in IndexedDB under draft-owned asset keys.
- Render those local assets in the preview.
- Upload them during authenticated draft migration.
- Replace local references with returned server URLs only after every required upload succeeds.
- Keep local assets when upload or publish fails.
- Delete local assets only after successful server persistence or explicit draft reset.

## Error handling

- Validation error: keep visitor on current step; focus first invalid field; preserve all input.
- Account already exists: explain clearly and switch emphasis to Sign in without losing draft.
- Signup failure: keep account panel open and draft visible.
- Expired confirmation: keep draft and offer resend or sign in.
- Offline before signup: keep local draft and disable publish with retry guidance.
- Server save failure after auth: keep account and draft; show `Retry publishing`.
- Slug collision: resolve slug only; never reset setup.
- Corrupt or unsupported local draft: do not crash. Offer a fresh draft and preserve recoverable fields where possible.

## Accessibility behavior

- Use an ordered semantic stepper with `aria-current="step"`.
- Move focus to each new screen heading.
- Keep keyboard navigation and visible focus for all cards and controls.
- Account panel traps focus and returns it to Publish when dismissed.
- Associate errors and instructions with their fields.
- Announce save, error, and publish status through restrained live regions.
- Do not communicate selection or completion through color alone.
- Maintain minimum 44px pointer targets.
- Give preview region a descriptive accessible name.

## Component boundaries

- `HomeExperience`: routes every Create entry to one guest-builder action.
- Landing components: emit either generic start or preselected-vertical start; never decide authentication.
- Guest builder coordinator: owns step, draft hydration, autosave, and resume state.
- Existing provider editors: continue owning provider, service, and availability forms.
- Preview adapter: renders existing public shell from guest `ModuleStore` while disabling server mutations.
- Publish gate: owns signup/sign-in mode and reassurance copy.
- Draft migration service: validates, persists, publishes, and clears local draft after success.

These boundaries keep guest state, auth state, and server publication separate.

## Analytics

Track:

- `guest_builder_started` with CTA source and optional vertical
- `guest_builder_services_completed`
- `guest_builder_preview_viewed`
- `guest_builder_publish_clicked`
- `guest_builder_signup_completed`
- `guest_builder_email_confirmed`
- `guest_builder_publish_completed`
- `guest_builder_publish_failed` with safe reason category

Primary metric: landing visitor to published page.

Key diagnostic: preview viewed to account created.

## Testing

### Unit

- Guest draft serialization, normalization, version handling, and clearing
- Resume-state parsing and safe return paths
- CTA-source and vertical initialization
- Publish validation and slug collision handling
- Existing-page conflict protection

### Component

- Header and hero Create buttons invoke identical action
- Business-type card starts same builder with vertical preselected
- Anonymous user can reach preview without auth
- Publish opens signup-first account gate
- Sign in remains secondary and preserves draft
- Auth errors preserve draft and preview context
- Preview blocks server hold and booking mutations

### End-to-end

1. Landing → hero Create → complete builder → preview → signup → confirm → publish.
2. Landing → header Create → same first builder screen.
3. Landing → business-type card → builder with type preselected, no login.
4. Refresh midway → exact draft and step restored.
5. Existing-email signup error → sign in → draft resumes.
6. Publish API failure → retry succeeds without data loss.
7. Existing configured user signs in → no automatic overwrite.

## Out of scope

- Passwordless or social authentication
- Multiple booking pages per account
- Anonymous public pages
- Anonymous server-side image storage
- Client bookings against an unpublished preview
- Large visual redesign of landing page, provider editors, or public booking page
