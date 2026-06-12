import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadConfig, loadSecrets } from '../core/config-loader.js';
import { ConfigError } from '../errors.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simploy-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('loads a valid config', () => {
    const config = {
      $schema: 'https://example.com/schema.json',
      environments: {
        dev: {
          servers: [
            {
              name: 'web',
              ssh: { host: 'localhost', port: 22, username: 'user', password: 'pass' },
              localPath: '.',
              remotePath: '/app',
              exclude: ['node_modules'],
              preserve: ['.env'],
              preDeploy: ['echo before'],
              postDeploy: ['echo after'],
            },
          ],
        },
      },
    };
    fs.writeFileSync(path.join(tmpDir, 'simploy.json'), JSON.stringify(config));
    const result = loadConfig(tmpDir, 'simploy.json');
    expect(result.$schema).toBe('https://example.com/schema.json');
    expect(result.environments.dev.servers[0].name).toBe('web');
    expect(result.environments.dev.servers[0].exclude).toEqual(['node_modules']);
    expect(result.environments.dev.servers[0].preserve).toEqual(['.env']);
  });

  it('throws ConfigError when file not found', () => {
    expect(() => loadConfig(tmpDir, 'simploy.json')).toThrow(ConfigError);
    expect(() => loadConfig(tmpDir, 'simploy.json')).toThrow('not found');
  });

  it('throws ConfigError on invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'simploy.json'), '{invalid}');
    expect(() => loadConfig(tmpDir, 'simploy.json')).toThrow(ConfigError);
    expect(() => loadConfig(tmpDir, 'simploy.json')).toThrow('not valid JSON');
  });

  it('throws ConfigError on schema validation failure', () => {
    fs.writeFileSync(path.join(tmpDir, 'simploy.json'), JSON.stringify({ environments: {} }));
    expect(() => loadConfig(tmpDir, 'simploy.json')).toThrow(ConfigError);
  });

  it('accepts SSH key config without password', () => {
    const config = {
      environments: {
        dev: {
          servers: [
            {
              name: 'web',
              ssh: { host: 'localhost', port: 22, username: 'user', privateKeyPath: '~/.ssh/id_rsa' },
              localPath: '.',
              remotePath: '/app',
            },
          ],
        },
      },
    };
    fs.writeFileSync(path.join(tmpDir, 'simploy.json'), JSON.stringify(config));
    const result = loadConfig(tmpDir, 'simploy.json');
    expect(result.environments.dev.servers[0].ssh.privateKeyPath).toBe('~/.ssh/id_rsa');
  });
});

describe('loadSecrets', () => {
  it('loads secrets config', () => {
    fs.writeFileSync(path.join(tmpDir, 'secrets.json'), JSON.stringify({ KEY: 'value' }));
    const result = loadSecrets(tmpDir, 'secrets.json');
    expect(result.KEY).toBe('value');
  });

  it('returns empty object when file not found', () => {
    const result = loadSecrets(tmpDir, 'nonexistent.json');
    expect(result).toEqual({});
  });

  it('throws ConfigError on invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'secrets.json'), 'not json');
    expect(() => loadSecrets(tmpDir, 'secrets.json')).toThrow(ConfigError);
  });
});