rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // ===============================================================
    // Assumed Data Model
    // ===============================================================
    // Collection: users
    // Document ID: Firebase Auth UID
    // Fields:
    //   - createdAt: timestamp (required, immutable)
    //   - updatedAt: timestamp (required)
    // Firebase Auth is the sole source for email, display name, and photo URL.
    // Derived projects extend this schema together with profile.model.ts.
    // ===============================================================

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function uidUnchanged() {
      return !('uid' in request.resource.data);
    }

    function uidNotModified() {
      return !('uid' in resource.data) && !('uid' in request.resource.data);
    }

    function isValidUserProfile(data) {
      return data.keys().hasAll(['createdAt', 'updatedAt'])
        && data.keys().hasOnly(['createdAt', 'updatedAt'])
        && data.createdAt is timestamp
        && data.updatedAt is timestamp;
    }

    match /users/{userId} {
      allow read: if isOwner(userId);

      allow create: if isOwner(userId)
        && uidUnchanged()
        && isValidUserProfile(request.resource.data)
        && request.resource.data.createdAt == request.time
        && request.resource.data.updatedAt == request.time;

      // There are no client-managed metadata fields in the starter.
      allow update, delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
