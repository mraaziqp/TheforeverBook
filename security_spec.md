# Security Specification

## Data Invariants
1. A **Project** must always have an `ownerId` matching the creator's UID.
2. A **Page** must belong to a valid `projectId`.
3. An **Asset** must belong to a valid `projectId`.
4. Only the owner of a Project can read or write its associated Pages and Assets.
5. `createdAt` is immutable.
6. `updatedAt` must be updated to the server time on every update.

## The Dirty Dozen Payloads
1. **Identity Theft**: Create a project with another user's UID as `ownerId`.
2. **Shadow Field injection**: Adding `isVerified: true` to a project document.
3. **Ghost Field update**: Updating a project to add a field and skipping validation.
4. **Orphaned Page**: Creating a page for a project ID that don't exist.
5. **Unauthorized Read**: Authenticated user trying to list projects they don't own.
6. **Immutable Violation**: Trying to change the `createdAt` timestamp.
7. **Resource Exhaustion**: Sending a 1MB string as a project `name`.
8. **ID Poisoning**: Using a 1.5KB junk string as a document ID.
9. **Email Spoofing**: Trying to access data with a non-verified email (if restricted).
10. **State Shortcut**: Modifying `pageNumber` to a negative value or skipping order.
11. **Type Mismatch**: Sending `canvasData` as a string instead of a Map.
12. **Gutter Overflow**: Creating an asset URL with a non-URI string.

## Test Strategy
All payloads above must return `PERMISSION_DENIED`.
Testing will be performed via rules verification and expected behavior in code.
