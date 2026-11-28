import { createClient, type Client } from '@connectrpc/connect';
import type { DescService } from '@bufbuild/protobuf';
import {
  NotesService,
  TagsService,
  AuthService,
  ApiKeysService,
  UserSettingsService,
  StatsService,
} from '@icco/etu-proto';
import { getTransport } from './transport';

export function createHeaders(authToken: string): Record<string, string> {
  return {
    Authorization: authToken,
  };
}

function lazy<T extends DescService>(service: T): { readonly client: Client<T> } {
  let client: Client<T> | undefined;
  return {
    get client() {
      return (client ??= createClient(service, getTransport()));
    },
  };
}

export const notesClient = lazy(NotesService);
export const tagsClient = lazy(TagsService);
export const authClient = lazy(AuthService);
export const apiKeysClient = lazy(ApiKeysService);
export const userSettingsClient = lazy(UserSettingsService);
export const statsClient = lazy(StatsService);

export type { Note, Tag, User, ApiKey } from '@icco/etu-proto';
