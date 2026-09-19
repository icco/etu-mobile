import { resolveUrl } from '../src/api/transport';

jest.mock('../src/utils/logger');

it.each(['localhost', '127.0.0.1', '10.0.2.2'])('allows native loopback HTTP for %s', host => {
  expect(resolveUrl(`http://${host}:50051`)).toBe(`http://${host}:50051`);
});

it.each(['0.0.0.0', 'server.local', 'example.com'])('requires TLS for %s', host => {
  expect(resolveUrl(`http://${host}:50051`)).toBe(`https://${host}:50051`);
  expect(resolveUrl(`${host}:50051`)).toBe(`https://${host}:50051`);
});
