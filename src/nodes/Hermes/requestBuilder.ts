import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { HttpMethod, ToolSchema } from './toolSchemas';

export interface BuiltRequest {
  method: HttpMethod;
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export function interpolatePath(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required path parameter: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

export function buildRequestFromSchema(
  executor: IExecuteFunctions,
  schema: ToolSchema,
  action: string,
  itemIndex: number,
): BuiltRequest {
  const operation = schema.operations[action];
  if (!operation) {
    throw new Error(`Unknown operation '${action}' for resource '${schema.name}'`);
  }

  const pathParams: Record<string, unknown> = {};
  const body: Record<string, unknown> = {};
  const query: Record<string, unknown> = {};
  const headers: Record<string, string> = {};

  for (const [paramName, paramDef] of Object.entries(schema.parameters)) {
    if (paramName === 'action') continue;

    const allowedActions = paramDef.displayOptions?.show?.action;
    if (allowedActions && !allowedActions.includes(action)) continue;

    let value: unknown;
    try {
      value = executor.getNodeParameter(paramName, itemIndex, undefined);
    } catch {
      continue;
    }

    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value === '') continue;

    if (paramDef.type === 'object' && typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        throw new NodeOperationError(
          executor.getNode(),
          `Parameter '${paramName}' must be valid JSON`,
          { itemIndex },
        );
      }
    }

    if (paramDef.splitAsArray && typeof value === 'string') {
      value = value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    const placement = paramDef.in ?? 'body';
    if (placement === 'path') {
      pathParams[paramName] = value;
    } else if (placement === 'query') {
      query[paramName] = value;
    } else if (placement === 'header') {
      const headerName = paramDef.header ?? paramName;
      headers[headerName] = String(value);
    } else {
      body[paramName] = value;
    }
  }

  const interpolatedPath = interpolatePath(operation.path, pathParams);

  return {
    method: operation.method,
    path: interpolatedPath,
    body: Object.keys(body).length > 0 ? body : undefined,
    query: Object.keys(query).length > 0 ? query : undefined,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  };
}

export function buildRequestFromRawMode(
  executor: IExecuteFunctions,
  itemIndex: number,
): BuiltRequest {
  const method = executor.getNodeParameter('rawMethod', itemIndex, 'POST') as HttpMethod;
  const path = executor.getNodeParameter('rawPath', itemIndex, '') as string;
  if (!path) {
    throw new NodeOperationError(executor.getNode(), 'Raw Mode requires a path', { itemIndex });
  }

  const rawBodyValue = executor.getNodeParameter('rawBody', itemIndex, '') as string;
  const rawQueryValue = executor.getNodeParameter('rawQuery', itemIndex, '') as string;

  let body: Record<string, unknown> | undefined;
  if (rawBodyValue && rawBodyValue.trim() !== '' && rawBodyValue.trim() !== '{}') {
    try {
      body = JSON.parse(rawBodyValue);
    } catch (err) {
      throw new NodeOperationError(
        executor.getNode(),
        `Raw Body must be valid JSON: ${(err as Error).message}`,
        { itemIndex },
      );
    }
  }

  let query: Record<string, unknown> | undefined;
  if (rawQueryValue && rawQueryValue.trim() !== '' && rawQueryValue.trim() !== '{}') {
    try {
      query = JSON.parse(rawQueryValue);
    } catch (err) {
      throw new NodeOperationError(
        executor.getNode(),
        `Raw Query must be valid JSON: ${(err as Error).message}`,
        { itemIndex },
      );
    }
  }

  return { method, path, body, query };
}
