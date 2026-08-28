# Learner identity boundary

LinguaThread separates public curriculum from private learner state.

## Current safe modes

- Without `DATABASE_URL`, profile and progress remain local to one browser installation. A fresh browser starts at onboarding and cannot receive another installation's state.
- With the identity migration applied, the server creates an opaque installation session. The raw token exists only in a `Secure`, `HttpOnly`, `SameSite=Lax` cookie; the database stores its SHA-256 hash.
- Profile and progress APIs derive ownership only from the server-issued session. Client-supplied learner IDs are ignored.

## Legacy migration

An existing installation may present its former UUID once during session bootstrap. The server hashes it, records a one-time claim, and moves matching profile, progress, attempts, and mastery evidence to the new private owner. The browser removes the legacy identifier only after the server confirms the claim.

Apply `drizzle/0004_private_learner_identity.sql` before enabling `DATABASE_URL` in production.

## Cross-device recovery

`learner_accounts` is the provider-neutral account boundary. A future verified identity-provider subject can link multiple private sessions to one learner. Do not populate it from an unverified email, client header, or self-asserted identifier.

Cross-device recovery remains disabled until an identity provider is selected and its server-side token verification is configured. Suitable choices include an established passkey/OAuth or email-link provider. The provider must supply a stable, verified subject; LinguaThread must never trust a client-submitted account ID.
