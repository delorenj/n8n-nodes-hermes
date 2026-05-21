import chatSchema from '../../../tool-schemas/chat.json';
import jobSchema from '../../../tool-schemas/job.json';
import responseSchema from '../../../tool-schemas/response.json';
import runSchema from '../../../tool-schemas/run.json';
import systemSchema from '../../../tool-schemas/system.json';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

export interface OperationSchema {
  method: HttpMethod;
  path: string;
}

export interface DisplayOptions {
  show?: Record<string, string[]>;
}

export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object';
  required?: boolean;
  description?: string;
  default?: unknown;
  enum?: string[];
  placeholder?: string;
  in?: 'body' | 'query' | 'path' | 'header';
  header?: string;
  splitAsArray?: boolean;
  displayOptions?: DisplayOptions;
}

export interface ToolSchema {
  name: string;
  label: string;
  description: string;
  actions?: string[];
  operations: Record<string, OperationSchema>;
  parameters: Record<string, ParameterSchema>;
}

export const toolSchemas: ToolSchema[] = [
  chatSchema as ToolSchema,
  responseSchema as ToolSchema,
  runSchema as ToolSchema,
  jobSchema as ToolSchema,
  systemSchema as ToolSchema,
];

export function findSchema(name: string): ToolSchema | undefined {
  return toolSchemas.find((s) => s.name === name);
}
