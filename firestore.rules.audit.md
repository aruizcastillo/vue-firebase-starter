# Firestore Rules Audit

## Scope and assumptions

- Cloud Firestore Standard edition, as specified by the starter setup guide.
- The only starter collection is the private `users/{firebaseAuthUid}` path.
- Application code can perform an owner-document transaction and one-time read
  on demand. Full mode additionally maintains one document listener and writes
  status transitions. It has no collection/group query, `where`, `orderBy`,
  `limit`, delete, or subcollection operation.
- Firebase Auth UID is the ownership authority encoded in the document path.
- Firebase Auth is the sole authority for email, display name, and photo URL;
  every rule variant rejects those fields in Firestore.
- Legacy schemas and migration writes are intentionally unsupported.

## Mode matrix

| Capability                              | Full        | Profile | Auth only |
| --------------------------------------- | ----------- | ------- | --------- |
| Owner creates/reads exact user document | Yes         | Yes     | No        |
| Owner deactivates/reactivates           | Yes         | No      | No        |
| Owner writes `suspended`                | No          | No      | No        |
| Identity fields in Firestore            | No          | No      | No        |
| Collection/cross-user/public access     | No          | No      | No        |
| Update/delete/subcollection access      | Status only | No      | No        |
| Unconfigured business paths             | No          | No      | No        |

Full mode validates exactly `status`, `createdAt`, and `updatedAt` on create
and update. Profile mode validates exactly the two timestamps on create and has
no client update operation. Creates require server-controlled timestamps;
full-mode updates preserve `createdAt`, require `updatedAt == request.time`, and
permit only `active -> deactivated` or `deactivated -> active`. Recursive
wildcards default-deny every unmatched path.

## Devil's advocate results

| Attack vector                              | Outcome                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Public document/list access                | Denied by authentication, owner path check, and default deny; emulator-tested.             |
| Cross-user CRUD                            | Denied because Auth UID must equal the document ID; emulator-tested.                       |
| Update bypass / create-vs-update gap       | Full updates rerun the domain validator; profile/auth-only updates are denied.             |
| Ownership hijacking by field injection     | Rejected by exact schema and UID helpers; ownership is not stored as mutable data.         |
| Immutable-field modification               | `createdAt` changes are denied; emulator-tested.                                           |
| Type juggling / required-field omission    | Timestamp/status types and all required fields are validated; emulator-tested.             |
| Resource exhaustion                        | No string/list/map fields exist; a 1 MB unknown payload is schema pollution and is denied. |
| Privilege escalation                       | `role`, `isAdmin`, and every unknown field are denied; emulator-tested.                    |
| Identity duplication or mixed-content leak | `email`, `displayName`, and `photoURL` are denied; cross-user reads are denied.            |
| Invalid status transition                  | Invalid, no-op, and owner suspension transitions are denied; emulator-tested.              |
| Schema pollution                           | `hasOnly` rejects fields on create and full-mode update; emulator-tested.                  |
| Timestamp manipulation                     | Client-selected create/update timestamps are denied; emulator-tested.                      |
| Path traversal/scoping                     | No path field exists; subcollections and unmatched paths are denied.                       |
| Negative/overflow values                   | Not applicable; no numeric field exists.                                                   |
| Counter/action replay                      | Not applicable; no counters exist.                                                         |
| Orphaned subcollection access              | Denied by recursive default deny; emulator-tested.                                         |
| Query mismatch                             | No query is required; direct owner document reads pass and collection reads fail.          |
| Validator pattern                          | Every allowed create and update invokes `isValidUserProfile`.                              |

No attack in the applicable model obtained unauthorized access. Syntax
compilation and behavior passed the Firestore emulator across 15 rule tests in
`tests/firestore.rules.spec.ts`, `tests/firestore.profile.rules.spec.ts`, and
`tests/firestore.auth-only.rules.spec.ts`.

## Security auditor assessment

```json
{
  "score": 5,
  "summary": "The three prototype rule sets default-deny unmatched access. Enabled profile modes expose only owner-scoped document creation/read, validate exact non-PII schemas and server timestamps, and full mode restricts all client updates to explicit status transitions.",
  "findings": []
}
```

This assessment covers only the starter-owned model. Derived projects must
audit and emulator-test every business collection and profile field they add.
