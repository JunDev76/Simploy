import { VariableError } from '../errors.js';

const VARIABLE_PATTERN = /\$\{([A-Z0-9_]+)\}/g;

export function resolveVariables(text: string, variables: Record<string, string>): string {
  const resolved = new Map<string, string>();

  function resolve(key: string, visited: Set<string>): string {
    if (resolved.has(key)) {
      return resolved.get(key)!;
    }

    if (visited.has(key)) {
      throw new VariableError(
        `Circular reference detected: ${[...visited, key].join(' -> ')}`,
      );
    }

    if (!(key in variables)) {
      throw new VariableError(
        `"${key}" is not defined in variables or simploy.secrets.json`,
      );
    }

    visited.add(key);
    const value = variables[key];
    const result = value.replace(VARIABLE_PATTERN, (_, refKey) => resolve(refKey, new Set(visited)));
    visited.delete(key);

    resolved.set(key, result);
    return result;
  }

  Object.keys(variables).forEach((key) => resolve(key, new Set()));

  return text.replace(VARIABLE_PATTERN, (_, key: string) => resolve(key, new Set()));
}