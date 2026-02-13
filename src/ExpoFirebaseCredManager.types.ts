export type AuthProvider = 'password' | 'google';

export type AuthResult = {
  idToken: string;
  provider: AuthProvider;
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

export type EmailPasswordInput = {
  email: string;
  password: string;
  forceRefreshIdToken?: boolean;
  savePasswordCredential?: boolean;
};

export type GoogleButtonInput = {
  webClientId?: string;
  nonce?: string;
  forceRefreshIdToken?: boolean;
};

export type GoogleBottomSheetInput = {
  webClientId?: string;
  nonce?: string;
  filterByAuthorizedAccounts?: boolean;
  autoSelectEnabled?: boolean;
  includePasswordOption?: boolean;
  retryWithAllGoogleAccountsOnNoCredential?: boolean;
  forceRefreshIdToken?: boolean;
};

export type SavePasswordCredentialInput = {
  email: string;
  password: string;
};

export type SignOutInput = {
  clearCredentialState?: boolean;
};

export type DeleteCurrentUserInput = {
  clearCredentialState?: boolean;
  reauthenticateIfRequired?: boolean;
  webClientId?: string;
  nonce?: string;
};

export type CurrentSessionInput = {
  forceRefreshIdToken?: boolean;
};

export type PluginOptions = {
  googleServicesFile: string;
  webClientId?: string;
  hostedDomainFilter?: string;
};

export const ExpoFirebaseCredManagerErrorCodes = {
  E_UNSUPPORTED_PLATFORM: 'E_UNSUPPORTED_PLATFORM',
  E_INVALID_INPUT: 'E_INVALID_INPUT',
  E_NO_ACTIVITY: 'E_NO_ACTIVITY',
  E_GOOGLE_WEB_CLIENT_ID_REQUIRED: 'E_GOOGLE_WEB_CLIENT_ID_REQUIRED',
  E_GOOGLE_ID_TOKEN_PARSE: 'E_GOOGLE_ID_TOKEN_PARSE',
  E_UNSUPPORTED_CREDENTIAL: 'E_UNSUPPORTED_CREDENTIAL',
  E_UNEXPECTED_CREDENTIAL_TYPE: 'E_UNEXPECTED_CREDENTIAL_TYPE',
  E_CANCELLED: 'E_CANCELLED',
  E_INTERRUPTED: 'E_INTERRUPTED',
  E_NO_CREDENTIAL: 'E_NO_CREDENTIAL',
  E_PROVIDER_CONFIGURATION: 'E_PROVIDER_CONFIGURATION',
  E_CUSTOM: 'E_CUSTOM',
  E_UNKNOWN: 'E_UNKNOWN',
  E_GET_CREDENTIAL: 'E_GET_CREDENTIAL',
  E_CREATE_CREDENTIAL: 'E_CREATE_CREDENTIAL',
  E_NO_CREATE_OPTION: 'E_NO_CREATE_OPTION',
  E_CLEAR_CREDENTIAL_STATE: 'E_CLEAR_CREDENTIAL_STATE',
  E_AUTH_INVALID_CREDENTIALS: 'E_AUTH_INVALID_CREDENTIALS',
  E_AUTH_INVALID_USER: 'E_AUTH_INVALID_USER',
  E_AUTH_REQUIRES_RECENT_LOGIN: 'E_AUTH_REQUIRES_RECENT_LOGIN',
  E_AUTH_REAUTH_REQUIRED: 'E_AUTH_REAUTH_REQUIRED',
  E_AUTH_EMAIL_ALREADY_IN_USE: 'E_AUTH_EMAIL_ALREADY_IN_USE',
  E_AUTH_WEAK_PASSWORD: 'E_AUTH_WEAK_PASSWORD',
  E_AUTH: 'E_AUTH',
  E_ID_TOKEN_UNAVAILABLE: 'E_ID_TOKEN_UNAVAILABLE',
} as const;

export type ExpoFirebaseCredManagerErrorCode =
  (typeof ExpoFirebaseCredManagerErrorCodes)[keyof typeof ExpoFirebaseCredManagerErrorCodes];

export interface ExpoFirebaseCredManagerError extends Error {
  code: ExpoFirebaseCredManagerErrorCode;
}

export type NativeExpoFirebaseCredManagerModule = {
  isAvailable(): Promise<boolean>;
  getCurrentSession(input: CurrentSessionInput): Promise<AuthResult | null>;
  signInWithEmailPassword(input: EmailPasswordInput): Promise<AuthResult>;
  signUpWithEmailPassword(input: EmailPasswordInput): Promise<AuthResult>;
  savePasswordCredential(input: SavePasswordCredentialInput): Promise<{ saved: true }>;
  signInWithGoogleButton(input: GoogleButtonInput): Promise<AuthResult>;
  signInWithGoogleBottomSheet(input: GoogleBottomSheetInput): Promise<AuthResult>;
  signOut(input: SignOutInput): Promise<void>;
  deleteCurrentUser(input: DeleteCurrentUserInput): Promise<void>;
  clearCredentialState(): Promise<void>;
};
