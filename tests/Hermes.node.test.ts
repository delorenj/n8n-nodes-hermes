import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { Hermes } from '../src/nodes/Hermes/Hermes.node';

function findProperty(node: Hermes, name: string) {
  return node.description.properties.find((p) => p.name === name);
}

describe('Hermes node description', () => {
  const node = new Hermes();

  it('registers the hermes node identity', () => {
    expect(node.description.name).toBe('hermes');
    expect(node.description.displayName).toBe('Hermes');
    expect(node.description.icon).toBe('file:hermes.svg');
  });

  it('requires the hermesApi credential', () => {
    expect(node.description.credentials).toEqual([{ name: 'hermesApi', required: true }]);
  });

  it('exposes a Resource dropdown with all five resources', () => {
    const resource = findProperty(node, 'resource');
    const values = ((resource?.options as Array<{ value: string }>) ?? []).map((o) => o.value);
    expect(values.sort()).toEqual(['chat', 'job', 'response', 'run', 'system']);
  });

  it('exposes a Raw Mode toggle and raw fields', () => {
    expect(findProperty(node, 'rawMode')?.type).toBe('boolean');
    expect(findProperty(node, 'rawMethod')?.type).toBe('options');
    expect(findProperty(node, 'rawPath')?.type).toBe('string');
    expect(findProperty(node, 'rawBody')?.type).toBe('json');
    expect(findProperty(node, 'rawQuery')?.type).toBe('json');
  });

  it('is usable as an AI agent tool', () => {
    expect(node.description.usableAsTool).toBe(true);
  });
});

describe('Hermes node execute', () => {
  function makeExecutor(
    params: Record<string, unknown>,
    httpRequest: ReturnType<typeof vi.fn>,
    continueOnFail = false,
  ): IExecuteFunctions {
    const inputItems: INodeExecutionData[] = [{ json: {} }];
    return {
      getInputData: vi.fn(() => inputItems),
      getCredentials: vi.fn(async () => ({
        apiUrl: 'http://127.0.0.1:8642',
        apiKey: 'test-key',
      })),
      getNodeParameter: vi.fn((name: string, _i: number, fallback?: unknown) => {
        if (name in params) return params[name];
        return fallback;
      }),
      getNode: vi.fn(() => ({ name: 'Hermes', type: 'hermes', typeVersion: 1 })),
      continueOnFail: vi.fn(() => continueOnFail),
      helpers: { httpRequest } as unknown as IExecuteFunctions['helpers'],
    } as unknown as IExecuteFunctions;
  }

  it('dispatches a typed POST /v1/runs request with Bearer auth', async () => {
    const httpRequest = vi.fn().mockResolvedValue({ run_id: 'run_42', status: 'started' });
    const exec = makeExecutor(
      {
        rawMode: false,
        resource: 'run',
        action: 'create',
        input: 'ping',
      },
      httpRequest,
    );
    const node = new Hermes();
    const result = await node.execute.call(exec);
    expect(httpRequest).toHaveBeenCalledOnce();
    const call = httpRequest.mock.calls[0][0];
    expect(call).toMatchObject({
      method: 'POST',
      url: 'http://127.0.0.1:8642/v1/runs',
      body: { input: 'ping' },
      json: true,
    });
    expect(call.headers.Authorization).toBe('Bearer test-key');
    expect(result[0][0].json).toEqual({ run_id: 'run_42', status: 'started' });
  });

  it('Raw Mode sends an arbitrary path verbatim', async () => {
    const httpRequest = vi.fn().mockResolvedValue({ ok: true });
    const exec = makeExecutor(
      {
        rawMode: true,
        rawMethod: 'GET',
        rawPath: '/v1/capabilities',
        rawBody: '{}',
        rawQuery: '{}',
      },
      httpRequest,
    );
    const node = new Hermes();
    await node.execute.call(exec);
    expect(httpRequest.mock.calls[0][0].method).toBe('GET');
    expect(httpRequest.mock.calls[0][0].url).toBe('http://127.0.0.1:8642/v1/capabilities');
    expect(httpRequest.mock.calls[0][0].body).toBeUndefined();
  });

  it('strips trailing slash from apiUrl', async () => {
    const httpRequest = vi.fn().mockResolvedValue({ status: 'ok' });
    const exec = makeExecutor(
      { rawMode: true, rawMethod: 'GET', rawPath: '/health', rawBody: '{}', rawQuery: '{}' },
      httpRequest,
    );
    (exec.getCredentials as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      apiUrl: 'http://hermes.example.com/',
      apiKey: 'tk',
    });
    const node = new Hermes();
    await node.execute.call(exec);
    expect(httpRequest.mock.calls[0][0].url).toBe('http://hermes.example.com/health');
  });

  it('continueOnFail wraps the error in the output', async () => {
    const httpRequest = vi.fn().mockRejectedValue(new Error('boom'));
    const exec = makeExecutor(
      { rawMode: true, rawMethod: 'GET', rawPath: '/health', rawBody: '{}', rawQuery: '{}' },
      httpRequest,
      true,
    );
    const node = new Hermes();
    const result = await node.execute.call(exec);
    expect(result[0][0].json).toEqual({ error: 'boom' });
  });
});
