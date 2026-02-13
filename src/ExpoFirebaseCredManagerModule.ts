import { CodedError, Platform, requireOptionalNativeModule } from 'expo-modules-core';

import type {
  AuthResult,
  CurrentSessionInput,
  DeleteCurrentUserInput,
  EmailPasswordInput,
  GoogleBottomSheetInput,
  GoogleButtonInput,
  NativeExpoFirebaseCredManagerModule,
  SavePasswordCredentialInput,
  SignOutInput,
} from './ExpoFirebaseCredManager.types';
import { ExpoFirebaseCredManagerErrorCodes } from './ExpoFirebaseCredManager.types';

const NativeModule =
  requireOptionalNativeModule<NativeExpoFirebaseCredManagerModule>('ExpoFirebaseCredManager');

function ensureAvailable(): NativeExpoFirebaseCredManagerModule {
  if (Platform.OS !== 'android') {
    throw new CodedError(
      ExpoFirebaseCredManagerErrorCodes.E_UNSUPPORTED_PLATFORM,
      'ExpoFirebaseCredManager is only available on Android.'
    );
  }
  if (!NativeModule) {
    throw new CodedError(
      ExpoFirebaseCredManagerErrorCodes.E_UNSUPPORTED_PLATFORM,
      'ExpoFirebaseCredManager native module not found. Rebuild your app after installing the module.'
    );
  }
  return NativeModule;
}

function assertNonEmpty(value: string, fieldName: string): void {
  if (!value || value.trim() === '') {
    throw new CodedError(
      ExpoFirebaseCredManagerErrorCodes.E_INVALID_INPUT,
      `${fieldName} cannot be blank.`
    );
  }
}

function normalizeEmailPasswordInput(input: EmailPasswordInput): EmailPasswordInput {
  return {
    email: input.email.trim(),
    password: input.password,
    forceRefreshIdToken: input.forceRefreshIdToken ?? false,
    savePasswordCredential: input.savePasswordCredential ?? true,
  };
}

function normalizeSavePasswordCredentialInput(
  input: SavePasswordCredentialInput
): SavePasswordCredentialInput {
  return {
    email: input.email.trim(),
    password: input.password,
  };
}

function normalizeGoogleButtonInput(input?: GoogleButtonInput): GoogleButtonInput {
  return {
    webClientId: input?.webClientId?.trim() || undefined,
    nonce: input?.nonce,
    forceRefreshIdToken: input?.forceRefreshIdToken ?? false,
  };
}

function normalizeGoogleBottomSheetInput(input?: GoogleBottomSheetInput): GoogleBottomSheetInput {
  return {
    webClientId: input?.webClientId?.trim() || undefined,
    nonce: input?.nonce,
    filterByAuthorizedAccounts: input?.filterByAuthorizedAccounts ?? true,
    autoSelectEnabled: input?.autoSelectEnabled ?? false,
    includePasswordOption: input?.includePasswordOption ?? true,
    retryWithAllGoogleAccountsOnNoCredential: input?.retryWithAllGoogleAccountsOnNoCredential ?? true,
    forceRefreshIdToken: input?.forceRefreshIdToken ?? false,
  };
}

function normalizeDeleteCurrentUserInput(input?: DeleteCurrentUserInput): DeleteCurrentUserInput {
  return {
    clearCredentialState: input?.clearCredentialState ?? true,
    reauthenticateIfRequired: input?.reauthenticateIfRequired ?? true,
    webClientId: input?.webClientId?.trim() || undefined,
    nonce: input?.nonce,
  };
}

export async function isAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android' || !NativeModule) {
    return false;
  }
  return await NativeModule.isAvailable();
}

export async function getCurrentSession(input?: CurrentSessionInput): Promise<AuthResult | null> {
  const native = ensureAvailable();
  return await native.getCurrentSession({
    forceRefreshIdToken: input?.forceRefreshIdToken ?? false,
  });
}

export async function signInWithEmailPassword(input: EmailPasswordInput): Promise<AuthResult> {
  const native = ensureAvailable();
  assertNonEmpty(input.email, 'email');
  assertNonEmpty(input.password, 'password');
  return await native.signInWithEmailPassword(normalizeEmailPasswordInput(input));
}

export async function signUpWithEmailPassword(input: EmailPasswordInput): Promise<AuthResult> {
  const native = ensureAvailable();
  assertNonEmpty(input.email, 'email');
  assertNonEmpty(input.password, 'password');
  return await native.signUpWithEmailPassword(normalizeEmailPasswordInput(input));
}

export async function savePasswordCredential(
  input: SavePasswordCredentialInput
): Promise<{ saved: true }> {
  const native = ensureAvailable();
  assertNonEmpty(input.email, 'email');
  assertNonEmpty(input.password, 'password');
  return await native.savePasswordCredential(normalizeSavePasswordCredentialInput(input));
}

export async function signInWithGoogleButton(input?: GoogleButtonInput): Promise<AuthResult> {
  const native = ensureAvailable();
  return await native.signInWithGoogleButton(normalizeGoogleButtonInput(input));
}

export async function signInWithGoogleBottomSheet(input?: GoogleBottomSheetInput): Promise<AuthResult> {
  const native = ensureAvailable();
  return await native.signInWithGoogleBottomSheet(normalizeGoogleBottomSheetInput(input));
}

export async function signOut(options?: SignOutInput): Promise<void> {
  const native = ensureAvailable();
  await native.signOut({ clearCredentialState: options?.clearCredentialState ?? false });
}

export async function deleteCurrentUser(options?: DeleteCurrentUserInput): Promise<void> {
  const native = ensureAvailable();
  await native.deleteCurrentUser(normalizeDeleteCurrentUserInput(options));
}

export async function clearCredentialState(): Promise<void> {
  const native = ensureAvailable();
  await native.clearCredentialState();
}
