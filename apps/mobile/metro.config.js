const { getDefaultConfig } = require('expo/metro-config');
// Expo SDK 57 resolves npm workspaces and tsconfig aliases automatically.
module.exports = getDefaultConfig(__dirname);
