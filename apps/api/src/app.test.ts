import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('API', { timeout: 60_000 }, () => {
  const app = buildApp({ logger: false });

  beforeAll(async () => {
    await app.ready();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  it('responde ao healthcheck com 200 e JSON', async () => {
    const response = await app.inject({ url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('serve a documentação e inclui o healthcheck no OpenAPI', async () => {
    const redirect = await app.inject({ url: '/docs' });
    expect(redirect.statusCode).toBe(301);
    expect(redirect.headers.location).toBe('/docs/');

    const response = await app.inject({ url: '/docs/' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(app.swagger().paths).toHaveProperty('/health.get');
  });
});
