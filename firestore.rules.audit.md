# Firestore Rules Audit

## Scope and assumptions

- Firestore Standard edition, as configured by the local emulator.
- The only collection used by the application is `users/{firebaseAuthUid}`.
- User documents contain private identity data and must only be readable by
  their owner.
- Firebase Authentication is the source of truth for identity fields.
- Clients may not create authorization fields such as `role` or `isAdmin`.

## Access and validation matrix

| Operation                                         | Required result |
| ------------------------------------------------- | --------------- |
| Unauthenticated create/read/update/delete         | Denied          |
| Owner create with exact valid schema              | Allowed         |
| Owner read                                        | Allowed         |
| Other-user read/write                             | Denied          |
| Owner update of identity fields with valid values | Allowed         |
| Change to `createdAt`                             | Denied          |
| Collection list                                   | Denied          |
| User subcollection access                         | Denied          |
| Delete                                            | Denied          |

## Devil's advocate results

| Attack                                               | Result                                     |
| ---------------------------------------------------- | ------------------------------------------ |
| Public list/get                                      | Denied by owner check/default deny         |
| Cross-user read/write                                | Denied by UID path ownership               |
| 81-character display name                            | Denied by size validation                  |
| Type juggling                                        | Denied by domain validator                 |
| Missing required field                               | Denied by `hasAll`                         |
| Schema pollution (`role`, `isAdmin`, arbitrary keys) | Denied by `hasOnly`                        |
| Immutable timestamp modification                     | Denied by update timestamp validation      |
| Client-controlled timestamps                         | Denied unless equal to `request.time`      |
| HTTP or oversized photo URL                          | Denied by URL validation                   |
| Email identity spoofing                              | Denied unless email matches the Auth token |
| Delete                                               | Explicitly denied                          |
| Orphaned subcollection access                        | Denied by default; no subcollection match  |

Automated assertions for these paths live in `tests/firestore.rules.spec.ts`.

## Security auditor assessment

```json
{
  "score": 5,
  "summary": "Strict ownership and comprehensive validation for the private users/{uid} model.",
  "findings": []
}
```
