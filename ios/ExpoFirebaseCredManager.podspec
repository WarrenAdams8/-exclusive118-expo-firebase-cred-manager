Pod::Spec.new do |s|
  s.name           = 'ExpoFirebaseCredManager'
  s.version        = '0.1.0'
  s.summary        = 'Expo module for Firebase Auth + Android Credential Manager flows'
  s.description    = 'Android-first Expo module that bridges Firebase Auth and Credential Manager sign-in results to JavaScript.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
