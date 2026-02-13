const signInWithEmailPasswordMock = jest.fn();
const signUpWithEmailPasswordMock = jest.fn();
const savePasswordCredentialMock = jest.fn();
const signInWithGoogleButtonMock = jest.fn();
const signInWithGoogleBottomSheetMock = jest.fn();
const signOutMock = jest.fn();
const deleteCurrentUserMock = jest.fn();
const clearCredentialStateMock = jest.fn();
const isAvailableMock = jest.fn();
const getCurrentSessionMock = jest.fn();

let platformOS: 'android' | 'ios' | 'web' = 'android';

jest.mock('expo-modules-core', () => ({
  CodedError: class CodedError extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  Platform: {
    get OS() {
      return platformOS;
    },
  },
  requireOptionalNativeModule: () => ({
    isAvailable: isAvailableMock,
    getCurrentSession: getCurrentSessionMock,
    signInWithEmailPassword: signInWithEmailPasswordMock,
    signUpWithEmailPassword: signUpWithEmailPasswordMock,
    savePasswordCredential: savePasswordCredentialMock,
    signInWithGoogleButton: signInWithGoogleButtonMock,
    signInWithGoogleBottomSheet: signInWithGoogleBottomSheetMock,
    signOut: signOutMock,
    deleteCurrentUser: deleteCurrentUserMock,
    clearCredentialState: clearCredentialStateMock,
  }),
}));

import {
  deleteCurrentUser,
  getCurrentSession,
  isAvailable,
  savePasswordCredential,
  signInWithEmailPassword,
  signInWithGoogleBottomSheet,
  signInWithGoogleButton,
  signOut,
  signUpWithEmailPassword,
} from '../ExpoFirebaseCredManagerModule';
import { ExpoFirebaseCredManagerErrorCodes } from '../ExpoFirebaseCredManager.types';

beforeEach(() => {
  platformOS = 'android';
  isAvailableMock.mockReset();
  getCurrentSessionMock.mockReset();
  signInWithEmailPasswordMock.mockReset();
  signUpWithEmailPasswordMock.mockReset();
  savePasswordCredentialMock.mockReset();
  signInWithGoogleButtonMock.mockReset();
  signInWithGoogleBottomSheetMock.mockReset();
  signOutMock.mockReset();
  deleteCurrentUserMock.mockReset();
  clearCredentialStateMock.mockReset();
});

describe('ExpoFirebaseCredManagerModule', () => {
  it('returns false on non-Android for isAvailable', async () => {
    platformOS = 'ios';

    const result = await isAvailable();

    expect(result).toBe(false);
    expect(isAvailableMock).not.toHaveBeenCalled();
  });

  it('passes getCurrentSession defaults', async () => {
    getCurrentSessionMock.mockResolvedValue(null);

    await getCurrentSession();

    expect(getCurrentSessionMock).toHaveBeenCalledWith({ forceRefreshIdToken: false });
  });

  it('validates blank email/password', async () => {
    await expect(signInWithEmailPassword({ email: '', password: 'secret' })).rejects.toMatchObject({
      code: ExpoFirebaseCredManagerErrorCodes.E_INVALID_INPUT,
    });
    await expect(signUpWithEmailPassword({ email: 'a@b.com', password: '' })).rejects.toMatchObject({
      code: ExpoFirebaseCredManagerErrorCodes.E_INVALID_INPUT,
    });
    await expect(savePasswordCredential({ email: ' ', password: 'secret' })).rejects.toMatchObject({
      code: ExpoFirebaseCredManagerErrorCodes.E_INVALID_INPUT,
    });
  });

  it('normalizes email input and default flags for email sign-in', async () => {
    signInWithEmailPasswordMock.mockResolvedValue({ idToken: 'token' });

    await signInWithEmailPassword({ email: '  user@example.com ', password: 'secret' });

    expect(signInWithEmailPasswordMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret',
      forceRefreshIdToken: false,
      savePasswordCredential: true,
    });
  });

  it('sends default options for Google bottom-sheet flow', async () => {
    signInWithGoogleBottomSheetMock.mockResolvedValue({ idToken: 'token' });

    await signInWithGoogleBottomSheet();

    expect(signInWithGoogleBottomSheetMock).toHaveBeenCalledWith({
      webClientId: undefined,
      nonce: undefined,
      filterByAuthorizedAccounts: true,
      autoSelectEnabled: false,
      includePasswordOption: true,
      retryWithAllGoogleAccountsOnNoCredential: true,
      forceRefreshIdToken: false,
    });
  });

  it('throws unsupported platform on iOS for auth calls', async () => {
    platformOS = 'ios';

    await expect(signInWithGoogleButton()).rejects.toMatchObject({
      code: ExpoFirebaseCredManagerErrorCodes.E_UNSUPPORTED_PLATFORM,
    });
    expect(signInWithGoogleButtonMock).not.toHaveBeenCalled();
  });

  it('passes sign out options with default false', async () => {
    signOutMock.mockResolvedValue(undefined);

    await signOut();

    expect(signOutMock).toHaveBeenCalledWith({ clearCredentialState: false });
  });

  it('passes delete current user options with defaults', async () => {
    deleteCurrentUserMock.mockResolvedValue(undefined);

    await deleteCurrentUser();

    expect(deleteCurrentUserMock).toHaveBeenCalledWith({
      clearCredentialState: true,
      reauthenticateIfRequired: true,
      webClientId: undefined,
      nonce: undefined,
    });
  });

  it('passes delete current user custom options', async () => {
    deleteCurrentUserMock.mockResolvedValue(undefined);

    await deleteCurrentUser({
      clearCredentialState: false,
      reauthenticateIfRequired: false,
      webClientId: '  test-client-id  ',
      nonce: 'nonce-123',
    });

    expect(deleteCurrentUserMock).toHaveBeenCalledWith({
      clearCredentialState: false,
      reauthenticateIfRequired: false,
      webClientId: 'test-client-id',
      nonce: 'nonce-123',
    });
  });

  it('throws unsupported platform on iOS for deleteCurrentUser', async () => {
    platformOS = 'ios';

    await expect(deleteCurrentUser()).rejects.toMatchObject({
      code: ExpoFirebaseCredManagerErrorCodes.E_UNSUPPORTED_PLATFORM,
    });
    expect(deleteCurrentUserMock).not.toHaveBeenCalled();
  });

  it('throws unsupported platform on web for deleteCurrentUser', async () => {
    platformOS = 'web';

    await expect(deleteCurrentUser()).rejects.toMatchObject({
      code: ExpoFirebaseCredManagerErrorCodes.E_UNSUPPORTED_PLATFORM,
    });
    expect(deleteCurrentUserMock).not.toHaveBeenCalled();
  });
});
