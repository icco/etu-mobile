/**
 * Jest setup: mock modules that require @icco/etu-proto (private package)
 * so tests run without NPM_TOKEN / GitHub Packages.
 */
/* eslint-env jest */
jest.mock('@icco/etu-proto', () => ({
  NotesService: {},
  TagsService: {},
  AuthService: {},
  ApiKeysService: {},
  UserSettingsService: {},
}));

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    GRPC_BACKEND_URL: 'http://localhost:50051',
  },
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve()),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({}),
  useRoute: () => ({}),
  useFocusEffect: () => {},
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null,
  }),
}));
