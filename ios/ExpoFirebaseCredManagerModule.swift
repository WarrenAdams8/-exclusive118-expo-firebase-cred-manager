import ExpoModulesCore

final class UnsupportedPlatformException: Exception {
  init() {
    super.init(
      name: "UnsupportedPlatform",
      description: "ExpoFirebaseCredManager is only available on Android.",
      code: "E_UNSUPPORTED_PLATFORM"
    )
  }
}

public class ExpoFirebaseCredManagerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoFirebaseCredManager")

    AsyncFunction("isAvailable") {
      false
    }

    AsyncFunction("getCurrentSession") { (_: [String: Any]) throws -> [String: Any]? in
      throw UnsupportedPlatformException()
    }

    AsyncFunction("signInWithEmailPassword") { (_: [String: Any]) throws -> [String: Any] in
      throw UnsupportedPlatformException()
    }

    AsyncFunction("signUpWithEmailPassword") { (_: [String: Any]) throws -> [String: Any] in
      throw UnsupportedPlatformException()
    }

    AsyncFunction("savePasswordCredential") { (_: [String: Any]) throws -> [String: Any] in
      throw UnsupportedPlatformException()
    }

    AsyncFunction("signInWithGoogleButton") { (_: [String: Any]) throws -> [String: Any] in
      throw UnsupportedPlatformException()
    }

    AsyncFunction("signInWithGoogleBottomSheet") { (_: [String: Any]) throws -> [String: Any] in
      throw UnsupportedPlatformException()
    }

    AsyncFunction("signOut") { (_: [String: Any]) throws -> Void in
      throw UnsupportedPlatformException()
    }

    AsyncFunction("deleteCurrentUser") { (_: [String: Any]) throws -> Void in
      throw UnsupportedPlatformException()
    }

    AsyncFunction("clearCredentialState") { () throws -> Void in
      throw UnsupportedPlatformException()
    }
  }
}
