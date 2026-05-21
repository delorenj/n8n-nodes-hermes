import { describe, expect, it, vi } from 'vitest';

import {
  buildRequestFromRawMode,
  buildRequestFromSchema,
  interpolatePath,
} from '../src/nodes/Hermes/requestBuilder';
import { findSchema } from '../src/nodes/Hermes/toolSchemas';

function mockExecutor(params: Record<string, unknown>) {
  return {
    getNodeParameter: vi.fn((name: string, _i: number, fallback?: unknown) => {
      if (name in params) return params[name];
      return fallback;
    }),
    getNode: vi.fn(() => ({ name: 'Hermes', type: 'hermes', typeVersion: 1 })),
  } as unknown as Parameters<typeof buildRequestFromSchema>[0];
}

describe('interpolatePath', () => {
  it('substitutes named path tokens', () => {
    expect(interpolatePath('/v1/runs/{runId}/stop', { runId: 'run_42' })).toBe(
      '/v1/runs/run_42/stop',
    );
  });

  it('url-encodes values', () => {
    expect(interpolatePath('/api/jobs/{jobId}', { jobId: 'a b/c?' })).toBe(
      '/api/jobs/a%20b%2Fc%3F',
    );
  });

  it('throws when a token is missing', () => {
    expect(() => interpolatePath('/v1/runs/{runId}', {})).toThrow(
      /Missing required path parameter/,
    );
  });
});

describe('buildRequestFromSchema', () => {
  it('builds GET /v1/runs/{runId} with no body', () => {
    const schema = findSchema('run')!;
    const exec = mockExecutor({ runId: 'run_42' });
    const req = buildRequestFromSchema(exec, schema, 'get', 0);
    expect(req).toEqual({
      method: 'GET',
      path: '/v1/runs/run_42',
      body: undefined,
      query: undefined,
      headers: undefined,
    });
  });

  it('builds POST /v1/runs with body parameters', () => {
    const schema = findSchema('run')!;
    const exec = mockExecutor({
      input: 'check the deploy',
      session_id: 'sess_1',
      instructions: 'Be concise.',
    });
    const req = buildRequestFromSchema(exec, schema, 'create', 0);
    expect(req.method).toBe('POST');
    expect(req.path).toBe('/v1/runs');
    expect(req.body).toEqual({
      input: 'check the deploy',
      session_id: 'sess_1',
      instructions: 'Be concise.',
    });
  });

  it('builds PATCH /api/jobs/{jobId} and routes splitAsArray into arrays', () => {
    const schema = findSchema('job')!;
    const exec = mockExecutor({
      jobId: 'job_42',
      schedule: '0 9 * * *',
      skills: 'memory, codex , web-search',
    });
    const req = buildRequestFromSchema(exec, schema, 'update', 0);
    expect(req.method).toBe('PATCH');
    expect(req.path).toBe('/api/jobs/job_42');
    expect(req.body).toEqual({
      schedule: '0 9 * * *',
      skills: ['memory', 'codex', 'web-search'],
    });
  });

  it('routes header parameters to headers, not body', () => {
    const schema = findSchema('chat')!;
    const exec = mockExecutor({
      messages: '[{"role":"user","content":"hi"}]',
      sessionId: 'sess_42',
    });
    const req = buildRequestFromSchema(exec, schema, 'complete', 0);
    expect(req.headers).toEqual({ 'X-Hermes-Session-Id': 'sess_42' });
    expect(req.body).toMatchObject({ messages: [{ role: 'user', content: 'hi' }] });
  });

  it('omits parameters hidden by displayOptions for the chosen action', () => {
    const schema = findSchema('response')!;
    // 'get' only uses responseId; passing 'input' (only visible for create) should be ignored
    const exec = mockExecutor({ responseId: 'resp_1', input: 'should not leak into GET' });
    const req = buildRequestFromSchema(exec, schema, 'get', 0);
    expect(req).toEqual({
      method: 'GET',
      path: '/v1/responses/resp_1',
      body: undefined,
      query: undefined,
      headers: undefined,
    });
  });

  it('parses JSON-typed object parameters', () => {
    const schema = findSchema('chat')!;
    const exec = mockExecutor({ messages: '[{"role":"user","content":"hello"}]' });
    const req = buildRequestFromSchema(exec, schema, 'complete', 0);
    expect(req.body).toEqual({ messages: [{ role: 'user', content: 'hello' }] });
  });

  it('throws on invalid JSON for object parameters', () => {
    const schema = findSchema('chat')!;
    const exec = mockExecutor({ messages: '{not json}' });
    expect(() => buildRequestFromSchema(exec, schema, 'complete', 0)).toThrow(/must be valid JSON/);
  });
});

describe('buildRequestFromRawMode', () => {
  it('builds a raw request from inline form values', () => {
    const exec = mockExecutor({
      rawMethod: 'POST',
      rawPath: '/v1/runs',
      rawBody: '{"input":"hi"}',
      rawQuery: '{}',
    });
    const req = buildRequestFromRawMode(exec, 0);
    expect(req).toEqual({
      method: 'POST',
      path: '/v1/runs',
      body: { input: 'hi' },
      query: undefined,
    });
  });

  it('throws when path is empty', () => {
    const exec = mockExecutor({ rawMethod: 'GET', rawPath: '', rawBody: '{}', rawQuery: '{}' });
    expect(() => buildRequestFromRawMode(exec, 0)).toThrow(/Raw Mode requires a path/);
  });

  it('throws on invalid JSON body', () => {
    const exec = mockExecutor({
      rawMethod: 'POST',
      rawPath: '/v1/runs',
      rawBody: '{ not: json }',
      rawQuery: '{}',
    });
    expect(() => buildRequestFromRawMode(exec, 0)).toThrow(/Raw Body must be valid JSON/);
  });
});
