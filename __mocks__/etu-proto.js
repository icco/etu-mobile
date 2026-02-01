/**
 * Minimal mock for @icco/etu-proto so tests run without NPM_TOKEN / GitHub Packages.
 * CI installs the real package; this allows local test runs when the package is missing.
 */
const noop = () => {};
const emptyService = { typeName: 'MockService', methods: {} };

module.exports = {
  NotesService: emptyService,
  TagsService: emptyService,
  AuthService: emptyService,
  ApiKeysService: emptyService,
  UserSettingsService: emptyService,
};
