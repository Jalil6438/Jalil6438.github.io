// Single source of truth for the app's release identity.
//
// Consumed by the UI (AboutPage, SettingsPage, MasjidaynTab) and by the
// /api/version Vercel Function. When cutting a release, bump APP_VERSION here
// and keep package.json "version" in sync — `npm run release:check` verifies
// the two agree and that no page hardcodes its own version string.

export const APP_NAME = "Al-Hifz";
export const APP_VERSION = "1.5.1";
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
export const RELEASE_YEAR = "2026";
