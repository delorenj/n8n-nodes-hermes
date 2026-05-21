import { describe, expect, it } from 'vitest';

import { findSchema, toolSchemas } from '../src/nodes/Hermes/toolSchemas';

describe('toolSchemas', () => {
  it('exposes the five Hermes resources', () => {
    const names = toolSchemas.map((s) => s.name).sort();
    expect(names).toEqual(['chat', 'job', 'response', 'run', 'system']);
  });

  it('every schema has required fields', () => {
    for (const schema of toolSchemas) {
      expect(schema.name, `${schema.name}: missing name`).toBeTruthy();
      expect(schema.label, `${schema.name}: missing label`).toBeTruthy();
      expect(schema.description, `${schema.name}: missing description`).toBeTruthy();
      expect(schema.operations, `${schema.name}: missing operations`).toBeTruthy();
      expect(schema.parameters, `${schema.name}: missing parameters`).toBeTruthy();
      expect(schema.actions?.length, `${schema.name}: missing actions`).toBeGreaterThan(0);
    }
  });

  it('every action has a corresponding operation entry with method and path', () => {
    for (const schema of toolSchemas) {
      for (const action of schema.actions ?? []) {
        const op = schema.operations[action];
        expect(op, `${schema.name}.${action}: missing operation`).toBeTruthy();
        expect(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']).toContain(op.method);
        expect(op.path).toMatch(/^\//);
      }
    }
  });

  it('parameter "in" placements are valid when set', () => {
    const allowed = new Set(['body', 'query', 'path', 'header']);
    for (const schema of toolSchemas) {
      for (const [paramName, def] of Object.entries(schema.parameters)) {
        if (def.in === undefined) continue;
        expect(allowed.has(def.in), `${schema.name}.${paramName} bad placement: ${def.in}`).toBe(
          true,
        );
        if (def.in === 'header') {
          expect(
            def.header,
            `${schema.name}.${paramName} header placement needs a header name`,
          ).toBeTruthy();
        }
      }
    }
  });

  it('path parameters declared by parameters cover every {token} in the path template', () => {
    for (const schema of toolSchemas) {
      for (const [actionName, op] of Object.entries(schema.operations)) {
        const tokens = Array.from(op.path.matchAll(/\{(\w+)\}/g)).map((m) => m[1]);
        for (const token of tokens) {
          const param = schema.parameters[token];
          expect(
            param,
            `${schema.name}.${actionName} path token {${token}} has no parameter def`,
          ).toBeTruthy();
          expect(
            param!.in,
            `${schema.name}.${actionName} path token ${token} must be in=path`,
          ).toBe('path');
        }
      }
    }
  });

  it('findSchema returns the requested schema or undefined', () => {
    expect(findSchema('chat')?.label).toBe('Chat');
    expect(findSchema('does-not-exist')).toBeUndefined();
  });
});
