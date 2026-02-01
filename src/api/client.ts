import { createClient } from '@connectrpc/connect';
import {
  NotesService,
  TagsService,
  AuthService,
  ApiKeysService,
  UserSettingsService,
} from '@icco/etu-proto';
import { getTransport } from './transport';

export function createHeaders(authToken: string): Record<string, string> {
  return {
    Authorization: authToken,
  };
}

function getNotesClient() {
  return createClient(NotesService, getTransport());
}

function getTagsClient() {
  return createClient(TagsService, getTransport());
}

function getAuthClient() {
  return createClient(AuthService, getTransport());
}

function getApiKeysClient() {
  return createClient(ApiKeysService, getTransport());
}

function getUserSettingsClient() {
  return createClient(UserSettingsService, getTransport());
}

export const notesClient = {
  get client() {
    return getNotesClient();
  },
};

export const tagsClient = {
  get client() {
    return getTagsClient();
  },
};

export const authClient = {
  get client() {
    return getAuthClient();
  },
};

export const apiKeysClient = {
  get client() {
    return getApiKeysClient();
  },
};

export const userSettingsClient = {
  get client() {
    return getUserSettingsClient();
  },
};

export type { Note, Tag, User, ApiKey } from '@icco/etu-proto';
