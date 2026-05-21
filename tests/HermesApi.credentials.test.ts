import { describe, expect, it } from 'vitest';

import { HermesApi } from '../src/credentials/HermesApi.credentials';

describe('HermesApi credential', () => {
  const cred = new HermesApi();

  it('declares the expected n8n credential name', () => {
    expect(cred.name).toBe('hermesApi');
    expect(cred.displayName).toBe('Hermes API');
  });

  it('exposes apiUrl and apiKey properties', () => {
    const names = cred.properties.map((p) => p.name);
    expect(names).toEqual(['apiUrl', 'apiKey']);
  });

  it('apiKey is a password field', () => {
    const apiKey = cred.properties.find((p) => p.name === 'apiKey');
    expect(apiKey?.typeOptions).toEqual({ password: true });
    expect(apiKey?.required).toBe(true);
  });

  it('default apiUrl points at the Hermes API server port', () => {
    const apiUrl = cred.properties.find((p) => p.name === 'apiUrl');
    expect(apiUrl?.default).toBe('http://127.0.0.1:8642');
  });
});
