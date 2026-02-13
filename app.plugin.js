const fs = require('fs');
const path = require('path');
const { AndroidConfig, createRunOncePlugin, withStringsXml } = require('expo/config-plugins');
const { name: packageName, version: packageVersion } = require('./package.json');

const WEB_CLIENT_ID_RESOURCE = 'firebase_cred_manager_web_client_id';
const HOSTED_DOMAIN_FILTER_RESOURCE = 'firebase_cred_manager_hosted_domain_filter';

function assertNonEmpty(name, value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`[expo-firebase-cred-manager] ${name} must be a non-empty string.`);
  }
}

function resolvePath(projectRoot, value) {
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.resolve(projectRoot, value);
}

function extractWebClientIdFromGoogleServices(filePath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `[expo-firebase-cred-manager] Failed to parse googleServicesFile JSON at ${filePath}: ${error.message}`
    );
  }

  const clients = Array.isArray(parsed.client) ? parsed.client : [];
  for (const client of clients) {
    const oauthClients = Array.isArray(client.oauth_client) ? client.oauth_client : [];
    for (const oauthClient of oauthClients) {
      if (
        oauthClient &&
        oauthClient.client_type === 3 &&
        typeof oauthClient.client_id === 'string' &&
        oauthClient.client_id.trim() !== ''
      ) {
        return oauthClient.client_id.trim();
      }
    }
  }

  return null;
}

function withExpoFirebaseCredManager(config, props = {}) {
  const { googleServicesFile, webClientId, hostedDomainFilter } = props;

  assertNonEmpty('googleServicesFile', googleServicesFile);
  if (webClientId !== undefined) {
    assertNonEmpty('webClientId', webClientId);
  }

  if (
    hostedDomainFilter !== undefined &&
    (typeof hostedDomainFilter !== 'string' || hostedDomainFilter.trim() === '')
  ) {
    throw new Error(
      '[expo-firebase-cred-manager] hostedDomainFilter must be a non-empty string when provided.'
    );
  }

  const projectRoot = config._internal?.projectRoot ?? process.cwd();
  const resolvedGoogleServicesFile = resolvePath(projectRoot, googleServicesFile);

  if (!fs.existsSync(resolvedGoogleServicesFile)) {
    throw new Error(
      `[expo-firebase-cred-manager] googleServicesFile does not exist at: ${resolvedGoogleServicesFile}`
    );
  }

  const resolvedWebClientId =
    (typeof webClientId === 'string' && webClientId.trim() !== '' ? webClientId.trim() : null) ??
    extractWebClientIdFromGoogleServices(resolvedGoogleServicesFile);

  if (!resolvedWebClientId) {
    throw new Error(
      '[expo-firebase-cred-manager] Could not find a Web OAuth client ID in google-services.json. ' +
      'Add oauth_client with client_type=3 or pass webClientId explicitly in plugin options.'
    );
  }

  config.android = config.android ?? {};
  config.android.googleServicesFile = googleServicesFile;

  return withStringsXml(config, modConfig => {
    let strings = modConfig.modResults;

    strings = AndroidConfig.Strings.setStringItem(
      [
        {
          $: { name: WEB_CLIENT_ID_RESOURCE, translatable: 'false' },
          _: resolvedWebClientId,
        },
      ],
      strings
    );

    if (hostedDomainFilter) {
      strings = AndroidConfig.Strings.setStringItem(
        [
          {
            $: { name: HOSTED_DOMAIN_FILTER_RESOURCE, translatable: 'false' },
            _: hostedDomainFilter,
          },
        ],
        strings
      );
    }

    modConfig.modResults = strings;
    return modConfig;
  });
}

module.exports = createRunOncePlugin(
  withExpoFirebaseCredManager,
  packageName,
  packageVersion
);
