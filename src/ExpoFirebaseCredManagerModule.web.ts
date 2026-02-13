import { CodedError } from 'expo-modules-core';

import type {
  AuthResult,
  CurrentSessionInput,
  DeleteCurrentUserInput,
  EmailPasswordInput,
  GoogleBottomSheetInput,
  GoogleButtonInput,
  SavePasswordCredentialInput,
  SignOutInput,
} from './ExpoFirebaseCredManager.types';
import { ExpoFirebaseCredManagerErrorCodes } from './ExpoFirebaseCredManager.types';

function unsupported(): never {
  throw new CodedError(
    ExpoFirebaseCredManagerErrorCodes.E_UNSUPPORTED_PLATFORM,
    'ExpoFirebaseCredManager is only available on Android.'
  );
}

export async function isAvailable(): Promise<boolean> {
  return false;
}

export async function getCurrentSession(_input?: CurrentSessionInput): Promise<AuthResult | null> {
  unsupported();
}

export async function signInWithEmailPassword(_input: EmailPasswordInput): Promise<AuthResult> {
  unsupported();
}

export async function signUpWithEmailPassword(_input: EmailPasswordInput): Promise<AuthResult> {
  unsupported();
}

export async function savePasswordCredential(
  _input: SavePasswordCredentialInput
): Promise<{ saved: true }> {
  unsupported();
}

export async function signInWithGoogleButton(_input?: GoogleButtonInput): Promise<AuthResult> {
  unsupported();
}

export async function signInWithGoogleBottomSheet(
  _input?: GoogleBottomSheetInput
): Promise<AuthResult> {
  unsupported();
}

export async function signOut(_input?: SignOutInput): Promise<void> {
  unsupported();
}

export async function deleteCurrentUser(_input?: DeleteCurrentUserInput): Promise<void> {
  unsupported();
}

export async function clearCredentialState(): Promise<void> {
  unsupported();
}
