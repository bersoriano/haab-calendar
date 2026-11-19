# Bank deposit receipt bookings

## Intent

Businesses using spaces, professional services, and open events can require a bank or cash deposit receipt before a customer submits a booking. Restaurants and invitation-only RSVPs are excluded. Customers remain account-free. A receipt is evidence for manual review, never proof of payment by itself.

## Customer flow

The final details step shows the exact structured amount, currency, bank identifiers, and reference. Confirm stays disabled until an image upload is complete and validated by the server. Submission creates a slot-consuming booking pending payment verification. The existing private booking link shows pending, rejected, or confirmed payment state and accepts a replacement receipt after rejection.

The existing hold is ten minutes, with one five-minute extension. Bank trips can outlast it. A resumable checkout preserves the reference and uploaded proof without preserving the slot. On return, the customer must select an available slot again. If amount changes, submission stops and business contact is shown.

## Business flow

An owner configures one bank account and deposit instructions, then enables deposits on eligible services with a structured full price. Owner sees uploaded receipt on the booking, checks the actual bank account, then confirms payment or rejects with a reason. Rejection starts a 24-hour correction period when customer notification succeeds. Owner delay before review never starts that period. Business handles refunds; Haab records `refund_due`.

## State and inventory

Booking state and payment state remain distinct. Pending verification and correction-required bookings occupy slots, event capacity, and daily limits. Rescheduling preserves payment state. A pending booking syncs to Google Calendar as a private busy event labeled payment pending; confirmation updates it. Customer and provider emails distinguish slot reservation from verified payment.

## Price and storage

Existing free-text service costs cannot determine deposit amounts. Eligible services require numeric price in minor units and an ISO currency code. Price and bank instructions are snapshotted into the payment request. Receipt images live in private storage with server-checked, scoped uploads and owner-only short-lived reads. No receipt is attached to email or calendar events.

## Retention

All submitted image attempts, including rejected and replaced images, remain for twelve calendar months from the later of service date or payment resolution. For cases still unresolved, the twelve-month clock starts at service date; alert owner before deletion. Twelve months is a hard maximum. Unattached staged uploads expire shortly after checkout expiry. Booking-history retention may be shorter; payment records and images must therefore have their own lifecycle. Delete objects through storage API, then their metadata, with retry and orphan reconciliation. Update privacy notices in both languages before release.

## Release boundaries

MVP supports one bank account, full-price deposit, one receipt image per attempt, manual review, replacement, and existing public booking types. OCR, automatic matching, multiple accounts, partial deposits, and automatic refunds wait.
