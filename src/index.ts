#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { init } from './commands/init.js';
import { deploy } from './commands/deploy.js';
import { SimployError } from './errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const program = new Command();

program
  .name('simploy')
  .description('A simple CI/CD deployment tool for SSH-based deployment.')
  .version(getVersion());

program
  .command('init')
  .description('Create simploy.json and simploy.secrets.json config files.')
  .action(async () => {
    try {
      await init();
    } catch (e: any) {
      handleError(e);
    }
  });

program
  .command('deploy')
  .description('Deploy your project to remote servers.')
  .option('-c, --config-path <path>', 'Path to config file', 'simploy.json')
  .option('-p, --secrets-path <path>', 'Path to secrets config file', 'simploy.secrets.json')
  .option('-e, --env <env>', 'Environment to deploy', 'dev')
  .option('-s, --server <name>', 'Deploy to a specific server only')
  .option('--dry-run', 'Preview what will be deployed without executing')
  .action(async (options) => {
    try {
      await deploy({
        configPath: options.configPath,
        secretsConfigPath: options.secretsPath,
        env: options.env,
        server: options.server,
        dryRun: options.dryRun ?? false,
      });
    } catch (e: any) {
      handleError(e);
    }
  });

function handleError(e: any): void {
  if (e instanceof SimployError) {
    console.error(`\nError: ${e.message}`);
  } else {
    console.error(`\nUnexpected error: ${e.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(e.stack);
    }
  }
  process.exitCode = 1;
}

program.parse(process.argv);