package expo.modules.firebasecredmanager

import android.app.Activity
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CreatePasswordRequest
import androidx.credentials.Credential
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPasswordOption
import androidx.credentials.PasswordCredential
import androidx.credentials.exceptions.ClearCredentialException
import androidx.credentials.exceptions.CreateCredentialCancellationException
import androidx.credentials.exceptions.CreateCredentialCustomException
import androidx.credentials.exceptions.CreateCredentialException
import androidx.credentials.exceptions.CreateCredentialInterruptedException
import androidx.credentials.exceptions.CreateCredentialNoCreateOptionException
import androidx.credentials.exceptions.CreateCredentialUnknownException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialCustomException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialInterruptedException
import androidx.credentials.exceptions.GetCredentialProviderConfigurationException
import androidx.credentials.exceptions.GetCredentialUnknownException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import com.google.firebase.auth.AuthResult
import com.google.firebase.auth.EmailAuthProvider
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.google.firebase.auth.FirebaseAuthRecentLoginRequiredException
import com.google.firebase.auth.FirebaseAuthUserCollisionException
import com.google.firebase.auth.FirebaseAuthWeakPasswordException
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.Locale
import kotlinx.coroutines.tasks.await

class EmailPasswordInputRecord : Record {
  @Field val email: String? = null
  @Field val password: String? = null
  @Field val forceRefreshIdToken: Boolean = false
  @Field val savePasswordCredential: Boolean = true
}

class SavePasswordCredentialInputRecord : Record {
  @Field val email: String? = null
  @Field val password: String? = null
}

class GoogleButtonInputRecord : Record {
  @Field val webClientId: String? = null
  @Field val nonce: String? = null
  @Field val forceRefreshIdToken: Boolean = false
}

class GoogleBottomSheetInputRecord : Record {
  @Field val webClientId: String? = null
  @Field val nonce: String? = null
  @Field val filterByAuthorizedAccounts: Boolean = true
  @Field val autoSelectEnabled: Boolean = false
  @Field val includePasswordOption: Boolean = true
  @Field val retryWithAllGoogleAccountsOnNoCredential: Boolean = true
  @Field val forceRefreshIdToken: Boolean = false
}

class SignOutInputRecord : Record {
  @Field val clearCredentialState: Boolean = false
}

class DeleteCurrentUserInputRecord : Record {
  @Field val clearCredentialState: Boolean = true
  @Field val reauthenticateIfRequired: Boolean = true
  @Field val webClientId: String? = null
  @Field val nonce: String? = null
}

class CurrentSessionInputRecord : Record {
  @Field val forceRefreshIdToken: Boolean = false
}

class ExpoFirebaseCredManagerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoFirebaseCredManager")

    Function("isAvailable") {
      try {
        val activity = appContext.activityProvider?.currentActivity ?: return@Function false
        CredentialManager.create(activity)
        true
      } catch (_: Throwable) {
        false
      }
    }

    AsyncFunction("getCurrentSession") Coroutine { input: CurrentSessionInputRecord ->
      val user = firebaseAuth().currentUser ?: return@Coroutine null
      val provider = detectProvider(user)
      buildAuthResultForUser(
        user = user,
        provider = provider,
        isNewUser = null,
        forceRefreshIdToken = input.forceRefreshIdToken
      )
    }

    AsyncFunction("signInWithEmailPassword") Coroutine { input: EmailPasswordInputRecord ->
      val email = input.email?.trim().orEmpty()
      val password = input.password.orEmpty()
      validateEmailPasswordInput(email, password)

      val activity = currentActivity()
      val auth = firebaseAuth()
      val authResult = try {
        auth.signInWithEmailAndPassword(email, password).await()
      } catch (e: Exception) {
        throw mapFirebaseException(e)
      }

      maybeSavePasswordCredential(activity, email, password, input.savePasswordCredential)
      buildAuthResult(authResult, "password", input.forceRefreshIdToken)
    }

    AsyncFunction("signUpWithEmailPassword") Coroutine { input: EmailPasswordInputRecord ->
      val email = input.email?.trim().orEmpty()
      val password = input.password.orEmpty()
      validateEmailPasswordInput(email, password)

      val activity = currentActivity()
      val auth = firebaseAuth()
      val authResult = try {
        auth.createUserWithEmailAndPassword(email, password).await()
      } catch (e: Exception) {
        throw mapFirebaseException(e)
      }

      maybeSavePasswordCredential(activity, email, password, input.savePasswordCredential)
      buildAuthResult(authResult, "password", input.forceRefreshIdToken)
    }

    AsyncFunction("savePasswordCredential") Coroutine { input: SavePasswordCredentialInputRecord ->
      val email = input.email?.trim().orEmpty()
      val password = input.password.orEmpty()
      validateEmailPasswordInput(email, password)

      val activity = currentActivity()
      savePasswordCredentialOrThrow(activity, email, password)
      mapOf("saved" to true)
    }

    AsyncFunction("signInWithGoogleButton") Coroutine { input: GoogleButtonInputRecord ->
      val activity = currentActivity()
      val authResult = signInWithGoogleButton(activity, input)
      buildAuthResult(authResult, "google", input.forceRefreshIdToken)
    }

    AsyncFunction("signInWithGoogleBottomSheet") Coroutine { input: GoogleBottomSheetInputRecord ->
      val activity = currentActivity()
      val credentialManager = credentialManager(activity)
      val initialFilterAuthorized = input.filterByAuthorizedAccounts
      val retryAllAccounts = input.retryWithAllGoogleAccountsOnNoCredential

      val firstAttempt = try {
        val request = buildGoogleBottomSheetRequest(activity, input, initialFilterAuthorized)
        credentialManager.getCredential(activity, request)
      } catch (e: GetCredentialException) {
        if (e is NoCredentialException && initialFilterAuthorized && retryAllAccounts) {
          try {
            val retryRequest = buildGoogleBottomSheetRequest(activity, input, false)
            credentialManager.getCredential(activity, retryRequest)
          } catch (retryException: GetCredentialException) {
            throw mapGetException(retryException)
          }
        } else {
          throw mapGetException(e)
        }
      }

      val (authResult, provider) = signInWithBottomSheetCredential(firstAttempt.credential)
      buildAuthResult(authResult, provider, input.forceRefreshIdToken)
    }

    AsyncFunction("signOut") Coroutine { input: SignOutInputRecord ->
      firebaseAuth().signOut()
      if (input.clearCredentialState) {
        clearCredentialStateOrThrow(currentActivity())
      }
      null
    }

    AsyncFunction("deleteCurrentUser") Coroutine { input: DeleteCurrentUserInputRecord ->
      val activity = currentActivity()
      val user = firebaseAuth().currentUser
        ?: throw ExpoFirebaseCredManagerException(
          "E_AUTH_INVALID_USER",
          "No signed-in Firebase user to delete."
        )

      deleteCurrentUserOrThrow(activity, user, input)

      if (input.clearCredentialState) {
        clearCredentialStateOrThrow(activity)
      }

      null
    }

    AsyncFunction("clearCredentialState").SuspendBody<Unit?> {
      clearCredentialStateOrThrow(currentActivity())
      null
    }
  }

  private fun currentActivity(): Activity {
    return appContext.activityProvider?.currentActivity
      ?: throw ExpoFirebaseCredManagerException(
        "E_NO_ACTIVITY",
        "No activity available. Ensure the app is in the foreground."
      )
  }

  private fun credentialManager(activity: Activity): CredentialManager = CredentialManager.create(activity)

  private fun firebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()

  private fun validateEmailPasswordInput(email: String, password: String) {
    if (email.isBlank()) {
      throw ExpoFirebaseCredManagerException("E_INVALID_INPUT", "email cannot be blank.")
    }
    if (password.isBlank()) {
      throw ExpoFirebaseCredManagerException("E_INVALID_INPUT", "password cannot be blank.")
    }
  }

  private suspend fun signInWithGoogleButton(
    activity: Activity,
    input: GoogleButtonInputRecord
  ): AuthResult {
    val request = GetCredentialRequest.Builder()
      .addCredentialOption(buildSignInWithGoogleOption(activity, input))
      .build()

    val response = try {
      credentialManager(activity).getCredential(activity, request)
    } catch (e: GetCredentialException) {
      throw mapGetException(e)
    }

    val credential = response.credential
    if (credential !is CustomCredential) {
      throw ExpoFirebaseCredManagerException(
        "E_UNEXPECTED_CREDENTIAL_TYPE",
        "Expected Google credential but received ${credential::class.java.name}."
      )
    }

    return signInToFirebaseWithGoogleCredential(credential)
  }

  private fun buildGoogleBottomSheetRequest(
    activity: Activity,
    input: GoogleBottomSheetInputRecord,
    filterByAuthorizedAccounts: Boolean
  ): GetCredentialRequest {
    val builder = GetCredentialRequest.Builder()
      .addCredentialOption(
        buildGoogleIdOption(
          activity = activity,
          webClientId = input.webClientId,
          nonce = input.nonce,
          filterByAuthorizedAccounts = filterByAuthorizedAccounts,
          autoSelectEnabled = input.autoSelectEnabled
        )
      )

    if (input.includePasswordOption) {
      builder.addCredentialOption(GetPasswordOption())
    }

    return builder.build()
  }

  private suspend fun signInWithBottomSheetCredential(credential: Credential): Pair<AuthResult, String> {
    return when (credential) {
      is PasswordCredential -> {
        val authResult = try {
          firebaseAuth().signInWithEmailAndPassword(credential.id, credential.password).await()
        } catch (e: Exception) {
          throw mapFirebaseException(e)
        }
        authResult to "password"
      }

      is CustomCredential -> {
        val authResult = signInToFirebaseWithGoogleCredential(credential)
        authResult to "google"
      }

      else -> {
        throw ExpoFirebaseCredManagerException(
          "E_UNSUPPORTED_CREDENTIAL",
          "Unsupported credential type: ${credential::class.java.name}"
        )
      }
    }
  }

  private suspend fun signInToFirebaseWithGoogleCredential(credential: CustomCredential): AuthResult {
    if (
      credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL &&
      credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_SIWG_CREDENTIAL
    ) {
      throw ExpoFirebaseCredManagerException(
        "E_UNSUPPORTED_CREDENTIAL",
        "Unsupported custom credential type: ${credential.type}"
      )
    }

    val googleCredential = try {
      GoogleIdTokenCredential.createFrom(credential.data)
    } catch (e: GoogleIdTokenParsingException) {
      throw ExpoFirebaseCredManagerException(
        "E_GOOGLE_ID_TOKEN_PARSE",
        e.message ?: "Failed to parse Google ID token credential.",
        e
      )
    }

    return try {
      val firebaseCredential = GoogleAuthProvider.getCredential(googleCredential.idToken, null)
      firebaseAuth().signInWithCredential(firebaseCredential).await()
    } catch (e: Exception) {
      throw mapFirebaseException(e)
    }
  }

  private suspend fun deleteCurrentUserOrThrow(
    activity: Activity,
    user: FirebaseUser,
    input: DeleteCurrentUserInputRecord
  ) {
    try {
      user.delete().await()
      return
    } catch (e: Exception) {
      if (e !is FirebaseAuthRecentLoginRequiredException) {
        throw mapDeleteException(e)
      }
    }

    if (!input.reauthenticateIfRequired) {
      throw ExpoFirebaseCredManagerException(
        "E_AUTH_REQUIRES_RECENT_LOGIN",
        "Recent login is required to delete the current user."
      )
    }

    reauthenticateCurrentUserOrThrow(activity, user, input)

    try {
      user.delete().await()
    } catch (e: Exception) {
      throw mapDeleteException(e)
    }
  }

  private suspend fun reauthenticateCurrentUserOrThrow(
    activity: Activity,
    user: FirebaseUser,
    input: DeleteCurrentUserInputRecord
  ) {
    when (detectReauthProvider(user)) {
      "password" -> reauthenticatePasswordUserOrThrow(activity, user)
      "google" -> reauthenticateGoogleUserOrThrow(activity, user, input.webClientId, input.nonce)
      else -> {
        throw ExpoFirebaseCredManagerException(
          "E_AUTH_REAUTH_REQUIRED",
          "Unable to reauthenticate automatically for the current user provider."
        )
      }
    }
  }

  private suspend fun reauthenticatePasswordUserOrThrow(activity: Activity, user: FirebaseUser) {
    val response = try {
      val request = GetCredentialRequest.Builder()
        .addCredentialOption(GetPasswordOption())
        .build()
      credentialManager(activity).getCredential(activity, request)
    } catch (e: GetCredentialException) {
      throw mapReauthGetException(e)
    }

    val credential = response.credential
    if (credential !is PasswordCredential) {
      throw ExpoFirebaseCredManagerException(
        "E_AUTH_REAUTH_REQUIRED",
        "Expected password credential for reauthentication but received ${credential::class.java.name}."
      )
    }

    val currentEmail = user.email
      ?.trim()
      ?.lowercase(Locale.ROOT)
      ?: throw ExpoFirebaseCredManagerException(
        "E_AUTH_REAUTH_REQUIRED",
        "Current user does not have an email address required for password reauthentication."
      )

    val credentialEmail = credential.id.trim().lowercase(Locale.ROOT)
    if (credentialEmail != currentEmail) {
      throw ExpoFirebaseCredManagerException(
        "E_AUTH_REAUTH_REQUIRED",
        "Credential account does not match the current Firebase user."
      )
    }

    try {
      val authCredential = EmailAuthProvider.getCredential(credential.id, credential.password)
      user.reauthenticate(authCredential).await()
    } catch (e: Exception) {
      throw mapReauthFirebaseException(e)
    }
  }

  private suspend fun reauthenticateGoogleUserOrThrow(
    activity: Activity,
    user: FirebaseUser,
    webClientId: String?,
    nonce: String?
  ) {
    val credentialManager = credentialManager(activity)
    val firstAttempt = try {
      val request = GetCredentialRequest.Builder()
        .addCredentialOption(
          buildGoogleIdOption(
            activity = activity,
            webClientId = webClientId,
            nonce = nonce,
            filterByAuthorizedAccounts = true,
            autoSelectEnabled = false
          )
        )
        .build()
      credentialManager.getCredential(activity, request)
    } catch (e: GetCredentialException) {
      if (e is NoCredentialException) {
        try {
          val retryRequest = GetCredentialRequest.Builder()
            .addCredentialOption(
              buildGoogleIdOption(
                activity = activity,
                webClientId = webClientId,
                nonce = nonce,
                filterByAuthorizedAccounts = false,
                autoSelectEnabled = false
              )
            )
            .build()
          credentialManager.getCredential(activity, retryRequest)
        } catch (retryException: GetCredentialException) {
          throw mapReauthGetException(retryException)
        }
      } else {
        throw mapReauthGetException(e)
      }
    }

    val credential = firstAttempt.credential
    if (credential !is CustomCredential) {
      throw ExpoFirebaseCredManagerException(
        "E_AUTH_REAUTH_REQUIRED",
        "Expected Google credential for reauthentication but received ${credential::class.java.name}."
      )
    }

    if (
      credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL &&
      credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_SIWG_CREDENTIAL
    ) {
      throw ExpoFirebaseCredManagerException(
        "E_AUTH_REAUTH_REQUIRED",
        "Unsupported custom credential type for reauthentication: ${credential.type}"
      )
    }

    val googleCredential = try {
      GoogleIdTokenCredential.createFrom(credential.data)
    } catch (e: GoogleIdTokenParsingException) {
      throw ExpoFirebaseCredManagerException(
        "E_AUTH_REAUTH_REQUIRED",
        e.message ?: "Failed to parse Google credential for reauthentication.",
        e
      )
    }

    try {
      val firebaseCredential = GoogleAuthProvider.getCredential(googleCredential.idToken, null)
      user.reauthenticate(firebaseCredential).await()
    } catch (e: Exception) {
      throw mapReauthFirebaseException(e)
    }
  }

  private suspend fun buildAuthResult(
    authResult: AuthResult,
    provider: String,
    forceRefreshIdToken: Boolean
  ): Map<String, Any?> {
    val user = authResult.user
      ?: throw ExpoFirebaseCredManagerException("E_AUTH", "Firebase user is unavailable after sign-in.")

    return buildAuthResultForUser(
      user = user,
      provider = provider,
      isNewUser = authResult.additionalUserInfo?.isNewUser,
      forceRefreshIdToken = forceRefreshIdToken
    )
  }

  private suspend fun buildAuthResultForUser(
    user: FirebaseUser,
    provider: String,
    isNewUser: Boolean?,
    forceRefreshIdToken: Boolean
  ): Map<String, Any?> {
    val idToken = try {
      user.getIdToken(forceRefreshIdToken).await().token
        ?: throw ExpoFirebaseCredManagerException(
          "E_ID_TOKEN_UNAVAILABLE",
          "Firebase ID token is unavailable for the current user."
        )
    } catch (e: ExpoFirebaseCredManagerException) {
      throw e
    } catch (e: Exception) {
      throw ExpoFirebaseCredManagerException(
        "E_ID_TOKEN_UNAVAILABLE",
        e.message ?: "Failed to retrieve Firebase ID token.",
        e
      )
    }

    return mapOf(
      "idToken" to idToken,
      "provider" to provider,
      "isNewUser" to isNewUser,
      "user" to mapOf<String, Any?>(
        "uid" to user.uid,
        "email" to user.email,
        "displayName" to user.displayName,
        "photoURL" to user.photoUrl?.toString(),
        "emailVerified" to user.isEmailVerified,
        "isAnonymous" to user.isAnonymous,
        "creationTimestamp" to user.metadata?.creationTimestamp,
        "lastSignInTimestamp" to user.metadata?.lastSignInTimestamp
      )
    )
  }

  private fun detectProvider(user: FirebaseUser): String {
    val providerIds = user.providerData
      .mapNotNull { it.providerId }
      .filter { it.isNotBlank() }
      .toSet()

    return when {
      providerIds.contains(GoogleAuthProvider.PROVIDER_ID) -> "google"
      providerIds.contains(EmailAuthProvider.PROVIDER_ID) -> "password"
      else -> "password"
    }
  }

  private fun detectReauthProvider(user: FirebaseUser): String? {
    val providerIds = user.providerData
      .mapNotNull { it.providerId }
      .filter { it.isNotBlank() }
      .toSet()

    return when {
      providerIds.contains(GoogleAuthProvider.PROVIDER_ID) -> "google"
      providerIds.contains(EmailAuthProvider.PROVIDER_ID) -> "password"
      else -> null
    }
  }

  private suspend fun maybeSavePasswordCredential(
    activity: Activity,
    email: String,
    password: String,
    shouldSave: Boolean
  ) {
    if (!shouldSave) {
      return
    }

    try {
      credentialManager(activity).createCredential(activity, CreatePasswordRequest(email, password))
    } catch (_: CreateCredentialException) {
      // Best-effort save to avoid failing a successful Firebase auth flow.
    }
  }

  private suspend fun savePasswordCredentialOrThrow(activity: Activity, email: String, password: String) {
    try {
      credentialManager(activity).createCredential(activity, CreatePasswordRequest(email, password))
    } catch (e: CreateCredentialException) {
      throw mapCreateException(e)
    }
  }

  private fun buildSignInWithGoogleOption(
    activity: Activity,
    input: GoogleButtonInputRecord
  ): GetSignInWithGoogleOption {
    val webClientId = resolveWebClientId(activity, input.webClientId)
    val hostedDomainFilter = getStringResource(activity, "firebase_cred_manager_hosted_domain_filter")

    return GetSignInWithGoogleOption.Builder(webClientId)
      .apply {
        if (!input.nonce.isNullOrBlank()) {
          setNonce(input.nonce)
        }
        if (!hostedDomainFilter.isNullOrBlank()) {
          setHostedDomainFilter(hostedDomainFilter)
        }
      }
      .build()
  }

  private fun buildGoogleIdOption(
    activity: Activity,
    webClientId: String?,
    nonce: String?,
    filterByAuthorizedAccounts: Boolean,
    autoSelectEnabled: Boolean
  ): GetGoogleIdOption {
    return GetGoogleIdOption.Builder()
      .setServerClientId(resolveWebClientId(activity, webClientId))
      .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
      .setAutoSelectEnabled(autoSelectEnabled)
      .apply {
        if (!nonce.isNullOrBlank()) {
          setNonce(nonce)
        }
      }
      .build()
  }

  private fun resolveWebClientId(activity: Activity, runtimeValue: String?): String {
    if (!runtimeValue.isNullOrBlank()) {
      return runtimeValue
    }

    val configuredValue = getStringResource(activity, "firebase_cred_manager_web_client_id")
    if (!configuredValue.isNullOrBlank()) {
      return configuredValue
    }

    throw ExpoFirebaseCredManagerException(
      "E_GOOGLE_WEB_CLIENT_ID_REQUIRED",
      "webClientId is required. Pass it in JS or configure firebase_cred_manager_web_client_id via plugin."
    )
  }

  private suspend fun clearCredentialStateOrThrow(activity: Activity) {
    try {
      credentialManager(activity).clearCredentialState(ClearCredentialStateRequest())
    } catch (e: ClearCredentialException) {
      throw ExpoFirebaseCredManagerException(
        "E_CLEAR_CREDENTIAL_STATE",
        e.message ?: "Failed to clear credential state.",
        e
      )
    }
  }

  private fun getStringResource(activity: Activity, name: String): String? {
    val resId = activity.resources.getIdentifier(name, "string", activity.packageName)
    return if (resId != 0) activity.getString(resId) else null
  }

  private fun mapCreateException(exception: CreateCredentialException): CodedException {
    val code = when (exception) {
      is CreateCredentialCancellationException -> "E_CANCELLED"
      is CreateCredentialInterruptedException -> "E_INTERRUPTED"
      is CreateCredentialNoCreateOptionException -> "E_NO_CREATE_OPTION"
      is CreateCredentialCustomException -> "E_CUSTOM"
      is CreateCredentialUnknownException -> "E_UNKNOWN"
      else -> "E_CREATE_CREDENTIAL"
    }

    return ExpoFirebaseCredManagerException(
      code,
      exception.message ?: "Failed to save credential.",
      exception
    )
  }

  private fun mapGetException(exception: GetCredentialException): CodedException {
    val code = when (exception) {
      is GetCredentialCancellationException -> "E_CANCELLED"
      is GetCredentialInterruptedException -> "E_INTERRUPTED"
      is NoCredentialException -> "E_NO_CREDENTIAL"
      is GetCredentialProviderConfigurationException -> "E_PROVIDER_CONFIGURATION"
      is GetCredentialCustomException -> "E_CUSTOM"
      is GetCredentialUnknownException -> "E_UNKNOWN"
      else -> "E_GET_CREDENTIAL"
    }

    return ExpoFirebaseCredManagerException(
      code,
      exception.message ?: "Failed to get credentials from Credential Manager.",
      exception
    )
  }

  private fun mapReauthGetException(exception: GetCredentialException): CodedException {
    return ExpoFirebaseCredManagerException(
      "E_AUTH_REAUTH_REQUIRED",
      exception.message ?: "Failed to retrieve credentials for reauthentication.",
      exception
    )
  }

  private fun mapReauthFirebaseException(exception: Exception): CodedException {
    return ExpoFirebaseCredManagerException(
      "E_AUTH_REAUTH_REQUIRED",
      exception.message ?: "Failed to reauthenticate the current Firebase user.",
      exception
    )
  }

  private fun mapDeleteException(exception: Exception): CodedException {
    if (exception is FirebaseAuthRecentLoginRequiredException) {
      return ExpoFirebaseCredManagerException(
        "E_AUTH_REQUIRES_RECENT_LOGIN",
        exception.message ?: "Recent login is required to delete the current user.",
        exception
      )
    }

    return mapFirebaseException(exception)
  }

  private fun mapFirebaseException(exception: Exception): CodedException {
    val code = when (exception) {
      is FirebaseAuthInvalidCredentialsException -> "E_AUTH_INVALID_CREDENTIALS"
      is FirebaseAuthInvalidUserException -> "E_AUTH_INVALID_USER"
      is FirebaseAuthRecentLoginRequiredException -> "E_AUTH_REQUIRES_RECENT_LOGIN"
      is FirebaseAuthUserCollisionException -> "E_AUTH_EMAIL_ALREADY_IN_USE"
      is FirebaseAuthWeakPasswordException -> "E_AUTH_WEAK_PASSWORD"
      else -> "E_AUTH"
    }

    return ExpoFirebaseCredManagerException(
      code,
      exception.message ?: "Firebase authentication failed.",
      exception
    )
  }
}

class ExpoFirebaseCredManagerException(
  code: String,
  message: String,
  cause: Throwable? = null
) : CodedException(code, message, cause)
