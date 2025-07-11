#!/usr/bin/env node

import {Command} from 'commander';
import {deploy} from 'commands/deploy';
import {init, migrate} from "commands/init";

const program = new Command();

program
  .name('Simploy (SimpleDeploy)')
  .description('A very simple CI/CD tool.')
  .version('1.0.0');

program
  .command('init')
  .description('Create setting files.')
  .action((options) => {
    init();
  });

program
  .command('migrate')
  .description('Migrate legacy simploy.json to new environments format.')
  .action(() => {
    migrate();
  });

program
  .command('deploy')
  .description('Deploy your project')
  .option('-c, --config-path <path>', 'Set path to config file')
  .option('-p, --private-config-path <path>', 'Set path to private config file')
  .option('-e, --env <env>', 'Set environment (default: dev)', 'dev')
  .action((options) => {
    deploy(options.configPath, options.privateConfigPath, options.env);
  });

program.parse(process.argv);
