import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { ConfigError } from '../errors.js';
import type { SimployConfig } from '../types.js';

const SSHConfigSchema = z.object({
  host: z.string().min(1, 'ssh.host is required'),
  port: z.number().int().min(1).max(65535).or(z.string()).default(22),
  username: z.string().min(1, 'ssh.username is required'),
  password: z.string().optional(),
  privateKeyPath: z.string().optional(),
  passphrase: z.string().optional(),
}).refine(
  (data) => data.password || data.privateKeyPath,
  'Either ssh.password or ssh.privateKeyPath is required',
);

const ServerConfigSchema = z.object({
  name: z.string().min(1, 'server name is required'),
  ssh: SSHConfigSchema,
  localPath: z.string().min(1, 'server.localPath is required'),
  remotePath: z.string().min(1, 'server.remotePath is required'),
  exclude: z.array(z.string()).optional(),
  preserve: z.array(z.string()).optional(),
  preDeploy: z.array(z.string()).optional(),
  postDeploy: z.array(z.string()).optional(),
});

const EnvironmentConfigSchema = z.object({
  servers: z.array(ServerConfigSchema).min(1, 'at least one server is required'),
  variables: z.record(z.string(), z.string()).optional(),
});

const SimployConfigSchema = z.object({
  $schema: z.string().optional(),
  environments: z.record(z.string(), EnvironmentConfigSchema),
}).refine(
  (data) => Object.keys(data.environments).length > 0,
  'at least one environment is required',
);

export function loadConfig(basePath: string, fileName: string): SimployConfig {
  const filePath = path.resolve(basePath, fileName);

  if (!fs.existsSync(filePath)) {
    throw new ConfigError(`${fileName} not found. Run 'simploy init' first.`);
  }

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    throw new ConfigError(`Failed to read ${fileName}.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError(`${fileName} is not valid JSON.`);
  }

  const result = SimployConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => i.message).join(', ');
    throw new ConfigError(`Invalid ${fileName}: ${issues}`);
  }

  return result.data;
}

export function loadSecrets(basePath: string, fileName: string): Record<string, string> {
  const filePath = path.resolve(basePath, fileName);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new ConfigError(`${fileName} must be a flat key-value object.`);
    }
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[key] = String(value);
      }
    }
    return result;
  } catch (e) {
    if (e instanceof ConfigError) throw e;
    throw new ConfigError(`${fileName} is not valid JSON.`);
  }
}