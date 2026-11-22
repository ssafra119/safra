# Safra Wholesale Catalog — Firestore Security Specification

## 1. Data Invariants
- **Products & Categories Read Gate**: Unauthenticated, blocked (`active == false`), or expired (`expiresAt <= request.time`) users MUST NOT read `products` or `categories`. Only active, unexpired subscribers or verified `admin`/`superadmin` users can read catalog items.
- **Inventory & Category Write Gate**: Only active, unexpired `admin` or `superadmin` users (or the verified bootstrapped superadmin) can create, update, or delete `products` and `categories`.
- **No Self-Registration or Privilege Escalation**: Sales reps cannot create `users/{uid}` documents or modify their own `role`, `active`, `expiresAt`, `name`, `phone`, or `createdAt`.
- **Strict 1-Device-Only Lock**: A user can only bind `deviceId` when `existing().deviceId` is unset/null/empty, and can NEVER overwrite an already-bound `deviceId` with a different value. Only `superadmin` can reset `deviceId` to `null`.
- **PII Isolation**: User records in `users/{uid}` contain phone numbers and notes and can only be read (`get`) by the owning user (`request.auth.uid == userId`) or `superadmin`, and listed (`list`) only by `superadmin`.

## 2. Adversarial Payloads Blocked ("Dirty Dozen")
1. Unauthenticated read on `/products/{id}` -> `PERMISSION_DENIED`
2. Unauthenticated read on `/categories/{id}` -> `PERMISSION_DENIED`
3. Blocked rep (`active: false`) reading `/products/{id}` -> `PERMISSION_DENIED`
4. Expired rep (`expiresAt < request.time`) reading `/products/{id}` -> `PERMISSION_DENIED`
5. Rep attempting to create `/users/{repUid}` with `role: "superadmin"` -> `PERMISSION_DENIED`
6. Rep attempting to update own `users/{repUid}` with `active: true` or extended `expiresAt` -> `PERMISSION_DENIED`
7. Rep attempting to overwrite an already-bound `deviceId` on `users/{repUid}` -> `PERMISSION_DENIED`
8. Rep attempting to read another rep's `/users/{otherUid}` -> `PERMISSION_DENIED`
9. Rep attempting to list `/users` -> `PERMISSION_DENIED`
10. Rep attempting to write `/products/{id}` -> `PERMISSION_DENIED`
11. Admin (`role: "admin"`, not `superadmin`) attempting to write `/users/{repUid}` -> `PERMISSION_DENIED`
12. Spoofed email claim with `email_verified: false` attempting admin write -> `PERMISSION_DENIED`
