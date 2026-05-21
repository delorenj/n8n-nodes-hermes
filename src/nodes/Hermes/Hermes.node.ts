import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestOptions,
  INodeExecutionData,
  INodeProperties,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { BuiltRequest } from './requestBuilder';
import { buildRequestFromRawMode, buildRequestFromSchema } from './requestBuilder';
import type { ParameterSchema } from './toolSchemas';
import { findSchema, toolSchemas } from './toolSchemas';

function buildResourceOptions(): INodeProperties['options'] {
  return toolSchemas.map((schema) => ({
    name: schema.label,
    value: schema.name,
    description: schema.description,
  })) as INodeProperties['options'];
}

function buildActionProperties(): INodeProperties[] {
  const properties: INodeProperties[] = [];
  for (const schema of toolSchemas) {
    if (!schema.actions || schema.actions.length === 0) continue;
    properties.push({
      displayName: 'Operation',
      name: 'action',
      type: 'options',
      displayOptions: { show: { resource: [schema.name], rawMode: [false] } },
      options: schema.actions.map((action) => ({
        name: action.charAt(0).toUpperCase() + action.slice(1),
        value: action,
      })),
      default: schema.actions[0],
      noDataExpression: true,
      required: true,
      description: `The ${schema.label} operation to perform`,
    });
  }
  return properties;
}

function mapType(schemaType: ParameterSchema['type']): NonNullable<INodeProperties['type']> {
  switch (schemaType) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'json';
    default:
      return 'string';
  }
}

function formatDisplayName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function buildParameterProperties(): INodeProperties[] {
  const properties: INodeProperties[] = [];
  for (const schema of toolSchemas) {
    for (const [paramName, paramDef] of Object.entries(schema.parameters)) {
      if (paramName === 'action') continue;

      const displayOptions: NonNullable<INodeProperties['displayOptions']> = {
        show: { resource: [schema.name], rawMode: [false] },
      };
      if (paramDef.displayOptions?.show?.action) {
        (displayOptions.show as Record<string, string[]>).action =
          paramDef.displayOptions.show.action;
      }

      const n8nType = mapType(paramDef.type);
      const defaultValue =
        paramDef.default !== undefined ? paramDef.default : n8nType === 'boolean' ? false : '';

      const prop: INodeProperties = {
        displayName: formatDisplayName(paramName),
        name: paramName,
        type: n8nType,
        displayOptions,
        default: defaultValue as INodeProperties['default'],
        required: paramDef.required ?? false,
        description: paramDef.description ?? '',
      };

      if (paramDef.enum && n8nType === 'string') {
        prop.type = 'options';
        prop.options = paramDef.enum.map((v) => ({
          name: v.charAt(0).toUpperCase() + v.slice(1),
          value: v,
        }));
      }
      if (paramDef.placeholder) {
        prop.placeholder = paramDef.placeholder;
      }
      if (paramDef.type === 'object') {
        prop.type = 'json';
        if (prop.default === '' || prop.default === undefined) {
          prop.default = '{}';
        }
      }

      properties.push(prop);
    }
  }
  return properties;
}

export class Hermes implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Hermes',
    name: 'hermes',
    icon: 'file:hermes.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + ($parameter["action"] || "raw")}}',
    description: 'Interact with the Hermes Agent (NousResearch) API server',
    defaults: { name: 'Hermes' },
    inputs: ['main'],
    outputs: ['main'],
    usableAsTool: true,
    credentials: [{ name: 'hermesApi', required: true }],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: buildResourceOptions(),
        default: 'chat',
        required: true,
        description: 'The Hermes resource to interact with',
      },
      {
        displayName: 'Raw Mode',
        name: 'rawMode',
        type: 'boolean',
        default: false,
        description:
          'Whether to send a raw HTTP request to any path on the Hermes API server, bypassing the typed parameter form. Useful for endpoints not yet covered with typed fields.',
      },
      {
        displayName: 'Method',
        name: 'rawMethod',
        type: 'options',
        displayOptions: { show: { rawMode: [true] } },
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' },
        ],
        default: 'POST',
        description: 'HTTP method',
      },
      {
        displayName: 'Path',
        name: 'rawPath',
        type: 'string',
        displayOptions: { show: { rawMode: [true] } },
        default: '/v1/chat/completions',
        placeholder: '/v1/runs',
        description: 'Path on the Hermes API server (e.g. /v1/chat/completions, /api/jobs)',
      },
      {
        displayName: 'Body (JSON)',
        name: 'rawBody',
        type: 'json',
        displayOptions: { show: { rawMode: [true] } },
        default: '{}',
        description: 'Request body as JSON. Leave empty for methods without a body.',
      },
      {
        displayName: 'Query Params (JSON)',
        name: 'rawQuery',
        type: 'json',
        displayOptions: { show: { rawMode: [true] } },
        default: '{}',
        description: 'Query string parameters as a flat JSON object',
      },
      ...buildActionProperties(),
      ...buildParameterProperties(),
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('hermesApi');
    const apiUrl = (credentials.apiUrl as string).replace(/\/$/, '');
    const apiKey = credentials.apiKey as string;

    for (let i = 0; i < items.length; i++) {
      try {
        const rawMode = this.getNodeParameter('rawMode', i, false) as boolean;
        let req: BuiltRequest;
        if (rawMode) {
          req = buildRequestFromRawMode(this, i);
        } else {
          const resource = this.getNodeParameter('resource', i) as string;
          const schema = findSchema(resource);
          if (!schema) {
            throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, {
              itemIndex: i,
            });
          }
          const action =
            schema.actions && schema.actions.length > 0
              ? (this.getNodeParameter('action', i) as string)
              : Object.keys(schema.operations)[0];
          req = buildRequestFromSchema(this, schema, action, i);
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json, text/event-stream;q=0.5',
          ...(req.headers ?? {}),
        };

        const options: IHttpRequestOptions = {
          method: req.method,
          url: `${apiUrl}${req.path}`,
          headers,
          json: true,
        };
        if (req.body !== undefined) options.body = req.body as IDataObject;
        if (req.query !== undefined) options.qs = req.query as IDataObject;

        const response = await this.helpers.httpRequest(options);
        returnData.push({ json: response as IDataObject, pairedItem: { item: i } });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message ?? String(error) } as IDataObject,
            pairedItem: { item: i },
          });
          continue;
        }
        if (error instanceof NodeApiError || error instanceof NodeOperationError) {
          throw error;
        }
        throw new NodeApiError(this.getNode(), error as JsonObject, {
          message: (error as Error).message ?? 'Hermes API request failed',
          itemIndex: i,
        });
      }
    }

    return [returnData];
  }
}
