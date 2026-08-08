const path = require("path");
const { load: loadEnv } = require("@expo/env");
loadEnv(path.join(__dirname));

const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Prevent nested react-native copies (e.g. from npm audit fix) from breaking codegen.
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    react: path.resolve(__dirname, "node_modules/react"),
    "react-native": path.resolve(__dirname, "node_modules/react-native"),
  },
  blockList: [
    ...(Array.isArray(config.resolver?.blockList)
      ? config.resolver.blockList
      : config.resolver?.blockList
        ? [config.resolver.blockList]
        : []),
    /node_modules[\\/]react-native[\\/]node_modules[\\/]react-native[\\/].*/,
  ],
};

module.exports = config;
