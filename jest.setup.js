/**
 * Jest setup: mocks for React Native and navigation in Node test env.
 */

import React from 'react';

// Load React Native Testing Library so built-in Jest matchers and cleanup are registered (v13+)
import '@testing-library/react-native';

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: false, assets: [] })),
  launchCamera: jest.fn(() => Promise.resolve({ didCancel: false, assets: [] })),
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(() => Promise.resolve([])),
  keepLocalCopy: jest.fn((opts) => Promise.resolve((opts.files || []).map((f) => ({ status: 'success', localUri: f.uri, sourceUri: f.uri })))),
  types: { audio: 'audio' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: jest.fn(() => false),
}));

jest.mock('react-native-fs', () => ({
  readFile: jest.fn(() => Promise.resolve('')),
  unlink: jest.fn(() => Promise.resolve()),
  stat: jest.fn(() => Promise.resolve({ size: 0 })),
}));

jest.mock('react-native-nitro-sound', () => ({
  __esModule: true,
  default: {
    startRecorder: jest.fn(() => Promise.resolve('')),
    stopRecorder: jest.fn(() => Promise.resolve('')),
    addRecordBackListener: jest.fn(),
    removeRecordBackListener: jest.fn(),
  },
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
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}));

// Mock @tanstack/react-query for testing
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  QueryClient: jest.fn().mockImplementation(() => ({
    clear: jest.fn(),
    invalidateQueries: jest.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));
