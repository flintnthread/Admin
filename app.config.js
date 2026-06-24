/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  expo: {
    ...config.expo,

    plugins: [
      ...(config.expo?.plugins ?? []),
      "expo-font",
      "@react-native-community/datetimepicker",
    ],
    android: {
      ...config.expo?.android,
      // Dev API uses http:// on port 8082 (admin-backend)
      usesCleartextTraffic: true,
    },
    ios: {
      ...config.expo?.ios,
      infoPlist: {
        ...(config.expo?.ios?.infoPlist ?? {}),
        NSAppTransportSecurity: {
          NSAllowsLocalNetworking: true,
        },
      },
    },
    extra: {
      ...config.expo?.extra,
      adminApiBaseUrl: process.env.EXPO_PUBLIC_ADMIN_API_BASE_URL,
      androidEmulatorApi: process.env.EXPO_PUBLIC_ANDROID_EMULATOR_API === "true",
    },
  },
});
