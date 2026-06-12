import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { DEFAULT_CONFIG, DEFAULT_SECRETS_CONFIG, CONFIG_FILE_NAME, SECRETS_CONFIG_FILE_NAME } from '../constants.js';
import * as logger from '../utils/logger.js';

export async function init(): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, CONFIG_FILE_NAME);
  const secretsPath = path.join(cwd, SECRETS_CONFIG_FILE_NAME);

  if (fs.existsSync(configPath)) {
    const overwrite = await prompt(`${CONFIG_FILE_NAME} already exists. Overwrite? (y/N) `);
    if (overwrite.toLowerCase() !== 'y') {
      logger.info(`Skipped creating ${CONFIG_FILE_NAME}.`);
      return;
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
  logger.success(`Created ${CONFIG_FILE_NAME}`);

  if (fs.existsSync(secretsPath)) {
    const overwrite = await prompt(`${SECRETS_CONFIG_FILE_NAME} already exists. Overwrite? (y/N) `);
    if (overwrite.toLowerCase() !== 'y') {
      logger.info(`Skipped creating ${SECRETS_CONFIG_FILE_NAME}.`);
      updateGitignore();
      return;
    }
  }

  fs.writeFileSync(secretsPath, JSON.stringify(DEFAULT_SECRETS_CONFIG, null, 2), 'utf-8');
  logger.success(`Created ${SECRETS_CONFIG_FILE_NAME}`);

  updateGitignore();
  logger.info('\nEdit the config files to complete the settings.');
}

function updateGitignore(): void {
  const cwd = process.cwd();
  const gitignorePath = path.join(cwd, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `${SECRETS_CONFIG_FILE_NAME}\n`, 'utf-8');
    logger.success(`Created .gitignore with ${SECRETS_CONFIG_FILE_NAME}`);
    return;
  }

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  const lines = content.split('\n').map((l) => l.trim());

  if (lines.includes(SECRETS_CONFIG_FILE_NAME)) return;

  const newContent = content.endsWith('\n')
    ? `${content}${SECRETS_CONFIG_FILE_NAME}\n`
    : `${content}\n${SECRETS_CONFIG_FILE_NAME}\n`;
  fs.writeFileSync(gitignorePath, newContent, 'utf-8');
  logger.success(`Added ${SECRETS_CONFIG_FILE_NAME} to .gitignore`);
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}