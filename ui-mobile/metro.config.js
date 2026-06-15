/* eslint-env node */
// Sentry's Expo Metro wrapper: it calls Expo's getDefaultConfig under the hood and adds the source-map
// serializer that stamps Debug IDs, so uploaded Hermes source maps match the bundle and JS stack traces
// symbolicate. Without this, native frames symbolicate (via dSYMs) but JS frames stay minified.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = config;
