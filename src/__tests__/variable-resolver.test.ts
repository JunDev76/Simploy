import { describe, it, expect } from 'vitest';
import { resolveVariables } from '../core/variable-resolver.js';
import { VariableError } from '../errors.js';

describe('resolveVariables', () => {
  it('replaces a simple variable', () => {
    expect(resolveVariables('Hello ${NAME}', { NAME: 'World' })).toBe('Hello World');
  });

  it('replaces multiple variables', () => {
    expect(resolveVariables('${GREETING} ${NAME}', { GREETING: 'Hello', NAME: 'World' })).toBe(
      'Hello World',
    );
  });

  it('resolves recursive variables', () => {
    const vars = { HOST: '${IP}:${PORT}', IP: '1.2.3.4', PORT: '8080' };
    expect(resolveVariables('Server: ${HOST}', vars)).toBe('Server: 1.2.3.4:8080');
  });

  it('resolves deeply nested variables', () => {
    const vars = { A: '${B}', B: '${C}', C: 'final' };
    expect(resolveVariables('${A}', vars)).toBe('final');
  });

  it('throws on undefined variable', () => {
    expect(() => resolveVariables('${UNDEFINED}', {})).toThrow(VariableError);
    expect(() => resolveVariables('${UNDEFINED}', {})).toThrow('"UNDEFINED" is not defined');
  });

  it('throws on circular reference', () => {
    const vars = { A: '${B}', B: '${A}' };
    expect(() => resolveVariables('${A}', vars)).toThrow(VariableError);
    expect(() => resolveVariables('${A}', vars)).toThrow('Circular reference');
  });

  it('returns original text when no variables present', () => {
    expect(resolveVariables('plain text', { FOO: 'bar' })).toBe('plain text');
  });

  it('handles variable in variable value only', () => {
    const vars = { FULL: '${BASE}/path', BASE: 'http://localhost' };
    expect(resolveVariables('${FULL}', vars)).toBe('http://localhost/path');
  });
});