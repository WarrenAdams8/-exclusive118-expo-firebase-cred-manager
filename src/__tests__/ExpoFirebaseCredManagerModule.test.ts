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
const getIdTokenMock = jest.fn();
const eventEmitterAddListenerMock = jest.fn();
const eventEmitterCtorMock = jest.fn();

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
  EventEmitter: class EventEmitter {
    constructor(nativeModule: unknown) {
      eventEmitterCtorMock(nativeModule);
    }

    addListener(eventName: string, listener: (...args: any[]) => void) {
      return eventEmitterAddListenerMock(eventName, listener);
    }
  },
  requireOptionalNativeModule: () => ({
    isAvailable: isAvailableMock,
    getCurrentSession: getCurrentSessionMock,
    getIdToken: getIdTokenMock,
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
  addAuthStateListener,
  deleteCurrentUser,
  getCurrentSession,
  getIdToken,
  getSpacetimeDBToken,
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
  getIdTokenMock.mockReset();
  signInWithEmailPasswordMock.mockReset();
  signUpWithEmailPasswordMock.mockReset();
  savePasswordCredentialMock.mockReset();
  signInWithGoogleButtonMock.mockReset();
  signInWithGoogleBottomSheetMock.mockReset();
  signOutMock.mockReset();
  deleteCurrentUserMock.mockReset();
  clearCredentialStateMock.mockReset();
  eventEmitterAddListenerMock.mockReset();
  eventEmitterCtorMock.mockReset();
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

  it('registers auth state listener with native event emitter', () => {
    const listener = jest.fn();
    const subscription = { remove: jest.fn() };
    eventEmitterAddListenerMock.mockReturnValue(subscription);

    const result = addAuthStateListener(listener);

    expect(eventEmitterAddListenerMock).toHaveBeenCalledWith('onAuthStateChanged', listener);
    expect(result).toBe(subscription);
  });

  it('throws unsupported platform on iOS for addAuthStateListener', () => {
    platformOS = 'ios';

    try {
      addAuthStateListener(jest.fn());
      fail('Expected addAuthStateListener to throw');
    } catch (error) {
      expect(error).toMatchObject({
        code: ExpoFirebaseCredManagerErrorCodes.E_UNSUPPORTED_PLATFORM,
      });
    }
    expect(eventEmitterAddListenerMock).not.toHaveBeenCalled();
  });

  it('reuses the same EventEmitter instance across addAuthStateListener calls', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    eventEmitterAddListenerMock.mockReturnValue({ remove: jest.fn() });

    addAuthStateListener(listener1);
    const ctorCountAfterFirst = eventEmitterCtorMock.mock.calls.length;

    addAuthStateListener(listener2);
    const ctorCountAfterSecond = eventEmitterCtorMock.mock.calls.length;

    expect(ctorCountAfterSecond).toBe(ctorCountAfterFirst);
    expect(eventEmitterAddListenerMock).toHaveBeenCalledTimes(2);
  });

  it('passes getIdToken defaults', async () => {
    getIdTokenMock.mockResolvedValue({ idToken: 'tok', expiresAt: 1700000000000 });

    await getIdToken();

    expect(getIdTokenMock).toHaveBeenCalledWith({ forceRefresh: false });
  });

  it('passes getIdToken with forceRefresh true', async () => {
    getIdTokenMock.mockResolvedValue({ idToken: 'tok', expiresAt: 1700000000000 });

    await getIdToken({ forceRefresh: true });

    expect(getIdTokenMock).toHaveBeenCalledWith({ forceRefresh: true });
  });

  it('returns null from getIdToken when no user is signed in', async () => {
    getIdTokenMock.mockResolvedValue(null);

    const result = await getIdToken();

    expect(result).toBeNull();
  });

  it('throws on iOS for getIdToken', async () => {
    platformOS = 'ios';

    await expect(getIdToken()).rejects.toMatchObject({
      code: ExpoFirebaseCredManagerErrorCodes.E_UNSUPPORTED_PLATFORM,
    });
  });

  it('getSpacetimeDBToken throws when no session exists', async () => {
    getCurrentSessionMock.mockResolvedValue(null);

    await expect(
      getSpacetimeDBToken({ spacetimeDbUrl: 'http://localhost:3000' })
    ).rejects.toMatchObject({
      code: ExpoFirebaseCredManagerErrorCodes.E_ID_TOKEN_UNAVAILABLE,
    });
  });

  it('getSpacetimeDBToken exchanges token with SpacetimeDB', async () => {
    getCurrentSessionMock.mockResolvedValue({
      idToken: 'firebase-jwt',
      idTokenExpiresAt: 1700000000000,
      provider: 'google',
      isNewUser: false,
      user: { uid: 'u1', email: null, displayName: null, photoURL: null, emailVerified: false, isAnonymous: false, creationTimestamp: null, lastSignInTimestamp: null },
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'stdb-short-lived-token' }),
    });
    global.fetch = fetchMock as any;

    const result = await getSpacetimeDBToken({ spacetimeDbUrl: 'http://localhost:3000' });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/v1/identity/websocket-token', {
      method: 'POST',
      headers: { Authorization: 'Bearer firebase-jwt' },
    });
    expect(result).toEqual({ token: 'stdb-short-lived-token' });
  });

  it('getSpacetimeDBToken strips trailing slashes from URL', async () => {
    getCurrentSessionMock.mockResolvedValue({
      idToken: 'firebase-jwt',
      idTokenExpiresAt: null,
      provider: 'password',
      isNewUser: false,
      user: { uid: 'u1', email: null, displayName: null, photoURL: null, emailVerified: false, isAnonymous: false, creationTimestamp: null, lastSignInTimestamp: null },
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok' }),
    });
    global.fetch = fetchMock as any;

    await getSpacetimeDBToken({ spacetimeDbUrl: 'http://localhost:3000///' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/v1/identity/websocket-token',
      expect.any(Object)
    );
  });

  it('getSpacetimeDBToken throws on non-ok response', async () => {
    getCurrentSessionMock.mockResolvedValue({
      idToken: 'firebase-jwt',
      idTokenExpiresAt: null,
      provider: 'google',
      isNewUser: false,
      user: { uid: 'u1', email: null, displayName: null, photoURL: null, emailVerified: false, isAnonymous: false, creationTimestamp: null, lastSignInTimestamp: null },
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    }) as any;

    await expect(
      getSpacetimeDBToken({ spacetimeDbUrl: 'http://localhost:3000' })
    ).rejects.toMatchObject({
      code: ExpoFirebaseCredManagerErrorCodes.E_SPACETIMEDB_TOKEN_EXCHANGE,
    });
  });
});
