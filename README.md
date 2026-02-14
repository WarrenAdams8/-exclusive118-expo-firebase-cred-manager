# @exclusive118/expo-firebase-cred-manager

Expo module for Firebase Auth and Android Credential Manager flows.

This package is Android-first. On iOS/web, methods throw `E_UNSUPPORTED_PLATFORM` (except `isAvailable`, which returns `false`).

## Install

```bash
npm install @exclusive118/expo-firebase-cred-manager
```

## Expo Plugin Setup

In `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@exclusive118/expo-firebase-cred-manager",
        {
          "googleServicesFile": "./google-services.json"
        }
      ]
    ]
  }
}
```

Plugin options:

- `googleServicesFile` (required): path to Android `google-services.json`
- `webClientId` (optional): override Google Web OAuth client ID
- `hostedDomainFilter` (optional): hosted domain filter for Google button flow

If `webClientId` is not provided, the plugin auto-detects it from `google-services.json` (`oauth_client` entry where `client_type` is `3`).

## Usage

```ts
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  savePasswordCredential,
  signInWithGoogleButton,
  signInWithGoogleBottomSheet,
  signOut,
  deleteCurrentUser,
  addAuthStateListener,
  clearCredentialState,
  getCurrentSession,
  isAvailable,
} from '@exclusive118/expo-firebase-cred-manager';
```

## API return values

Most exported methods are async and return a `Promise`. `addAuthStateListener` returns a subscription object synchronously.

| Function | Resolves with |
| --- | --- |
| `isAvailable()` | `Promise<boolean>` |
| `getCurrentSession(input?)` | `Promise<AuthResult \| null>` |
| `signInWithEmailPassword(input)` | `Promise<AuthResult>` |
| `signUpWithEmailPassword(input)` | `Promise<AuthResult>` |
| `savePasswordCredential(input)` | `Promise<{ saved: true }>` |
| `signInWithGoogleButton(input?)` | `Promise<AuthResult>` |
| `signInWithGoogleBottomSheet(input?)` | `Promise<AuthResult>` |
| `signOut(options?)` | `Promise<void>` |
| `deleteCurrentUser(options?)` | `Promise<void>` |
| `addAuthStateListener(listener)` | `AuthStateSubscription` |
| `clearCredentialState()` | `Promise<void>` |

`deleteCurrentUser(options?)` behavior:

- `clearCredentialState` defaults to `true`
- `reauthenticateIfRequired` defaults to `true`
- `webClientId`/`nonce` are optional and used for Google reauthentication when recent login is required

Note: `clearCredentialState` clears provider session state in Credential Manager. It does not guarantee removal of saved passwords/passkeys.

`addAuthStateListener(listener)` behavior:

- Emits `onAuthStateChanged` whenever Firebase auth state changes.
- Listener receives `{ session: AuthStateSession | null }`.
- `session` includes `provider` and `user` fields; if signed out, `session` is `null`.
- Use `subscription.remove()` to stop listening.

Example:

```ts
import { useEffect } from 'react';
import { addAuthStateListener } from '@exclusive118/expo-firebase-cred-manager';

useEffect(() => {
  const subscription = addAuthStateListener(({ session }) => {
    if (!session) {
      console.log('User signed out');
      return;
    }

    console.log('Auth provider:', session.provider);
    console.log('User uid:', session.user.uid);
  });

  return () => {
    subscription.remove();
  };
}, []);
```

## Error codes

Rejections are `ExpoFirebaseCredManagerError` objects (an `Error` plus a `code` field):

```ts
type ExpoFirebaseCredManagerError = Error & { code: ExpoFirebaseCredManagerErrorCode };
```

```ts
try {
  const session = await getCurrentSession();
} catch (error) {
  const e = error as { code?: string; message?: string };
  if (e.code === 'E_UNSUPPORTED_PLATFORM') {
    // handle Android-only behavior
  }
}
```

`ExpoFirebaseCredManagerErrorCode` values:

`E_UNSUPPORTED_PLATFORM`, `E_INVALID_INPUT`, `E_NO_ACTIVITY`, `E_GOOGLE_WEB_CLIENT_ID_REQUIRED`, `E_GOOGLE_ID_TOKEN_PARSE`, `E_UNSUPPORTED_CREDENTIAL`, `E_UNEXPECTED_CREDENTIAL_TYPE`, `E_CANCELLED`, `E_INTERRUPTED`, `E_NO_CREDENTIAL`, `E_PROVIDER_CONFIGURATION`, `E_CUSTOM`, `E_UNKNOWN`, `E_GET_CREDENTIAL`, `E_CREATE_CREDENTIAL`, `E_NO_CREATE_OPTION`, `E_CLEAR_CREDENTIAL_STATE`, `E_AUTH_INVALID_CREDENTIALS`, `E_AUTH_INVALID_USER`, `E_AUTH_REQUIRES_RECENT_LOGIN`, `E_AUTH_REAUTH_REQUIRED`, `E_AUTH_EMAIL_ALREADY_IN_USE`, `E_AUTH_WEAK_PASSWORD`, `E_AUTH`, `E_ID_TOKEN_UNAVAILABLE`.

Delete-specific recovery notes:

- `E_AUTH_REQUIRES_RECENT_LOGIN`: deleting the user requires a recent login and automatic reauthentication was disabled.
- `E_AUTH_REAUTH_REQUIRED`: automatic reauthentication failed (for example cancelled, no credential, mismatch, or invalid credential). Prompt sign-in and retry delete.

`AuthResult` shape:

```ts
type AuthResult = {
  idToken: string;
  provider: 'password' | 'google';
  isNewUser: boolean | null;
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    creationTimestamp: number | null;
    lastSignInTimestamp: number | null;
  };
};
```
