import process from 'node:process';

export default ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId) return config;

  const suffix = '.apps.googleusercontent.com';
  if (!iosClientId.endsWith(suffix) || iosClientId.length === suffix.length) {
    throw new Error('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID inválido.');
  }

  const plugin = '@react-native-google-signin/google-signin';
  return {
    ...config,
    plugins: config.plugins.map((entry) =>
      Array.isArray(entry) && entry[0] === plugin
        ? [
            plugin,
            {
              iosUrlScheme: `com.googleusercontent.apps.${iosClientId.slice(0, -suffix.length)}`,
            },
          ]
        : entry,
    ),
  };
};
