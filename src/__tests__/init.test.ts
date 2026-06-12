import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { init } from '../commands/init.js';

let originalCwd: string;
let tmpDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simploy-init-test-'));
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('init', () => {
  it('creates config files', async () => {
    await init();
    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, 'simploy.json'), 'utf-8'));
    expect(config.$schema).toContain('schema.json');
    expect(fs.existsSync(path.join(tmpDir, 'simploy.secrets.json'))).toBe(true);
  });

  it('creates .gitignore if not exists', async () => {
    await init();
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('simploy.secrets.json');
  });

  it('appends simploy.secrets.json to existing .gitignore', async () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules\n', 'utf-8');
    await init();
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('simploy.secrets.json');
    expect(gitignore).toContain('node_modules');
  });

  it('does not duplicate gitignore entry', async () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'simploy.secrets.json\n', 'utf-8');
    await init();
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    const count = gitignore.split('simploy.secrets.json').length - 1;
    expect(count).toBe(1);
  });
});