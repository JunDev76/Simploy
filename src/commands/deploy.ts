import { loadConfig, loadSecrets } from '../core/config-loader.js';
import { resolveVariables } from '../core/variable-resolver.js';
import { withSSH } from '../core/ssh-manager.js';
import { transferFiles } from '../core/file-transfer.js';
import { executeRemoteShell } from '../core/remote-shell.js';
import { SimployError } from '../errors.js';
import { CONFIG_FILE_NAME, SECRETS_CONFIG_FILE_NAME } from '../constants.js';
import * as logger from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import type { DeployOptions, ServerConfig } from '../types.js';

interface ServerResult {
  name: string;
  success: boolean;
  error?: string;
}

export async function deploy(options: DeployOptions): Promise<void> {
  const basePath = process.cwd();
  const configFileName = options.configPath ?? CONFIG_FILE_NAME;
  const secretsConfigFileName = options.secretsConfigPath ?? SECRETS_CONFIG_FILE_NAME;

  const config = loadConfig(basePath, configFileName);
  const secrets = loadSecrets(basePath, secretsConfigFileName);

  const envConfig = config.environments[options.env];
  if (!envConfig) {
    throw new SimployError(
      `Environment '${options.env}' not found in ${configFileName}. Available: ${Object.keys(config.environments).join(', ')}`,
    );
  }

  const variables: Record<string, string> = { ...(envConfig.variables ?? {}), ...secrets };

  let servers = envConfig.servers;
  if (options.server) {
    servers = servers.filter((s) => s.name === options.server);
    if (servers.length === 0) {
      throw new SimployError(
        `Server '${options.server}' not found in environment '${options.env}'. Available: ${envConfig.servers.map((s) => s.name).join(', ')}`,
      );
    }
  }

  if (options.dryRun) {
    logger.info('=== Dry Run Mode ===');
    logger.info(`Environment: ${options.env}`);
    logger.info(`Servers: ${servers.map((s) => s.name).join(', ')}`);
    logger.info('');
  }

  const results: ServerResult[] = [];

  for (const server of servers) {
    const result = await deployToServer(server, variables, options.dryRun ?? false);
    results.push(result);
  }

  logger.bold('\n=== Deployment Summary ===');
  for (const result of results) {
    if (result.success) {
      logger.success(`  ✓ ${result.name}`);
    } else {
      logger.error(`  ✗ ${result.name}: ${result.error}`);
    }
  }

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function deployToServer(
  server: ServerConfig,
  variables: Record<string, string>,
  dryRun: boolean,
): Promise<ServerResult> {
  const spinner = createSpinner(`Deploying to ${server.name}...`);

  try {
    const sshConfig = {
      host: resolveVariables(server.ssh.host, variables),
      port: Number(resolveVariables(String(server.ssh.port), variables)),
      username: resolveVariables(server.ssh.username, variables),
      ...(server.ssh.password ? { password: resolveVariables(server.ssh.password, variables) } : {}),
      ...(server.ssh.privateKeyPath
        ? { privateKeyPath: resolveVariables(server.ssh.privateKeyPath, variables) }
        : {}),
      ...(server.ssh.passphrase ? { passphrase: resolveVariables(server.ssh.passphrase, variables) } : {}),
    };

    const localPath = resolveVariables(server.localPath, variables);
    const remotePath = resolveVariables(server.remotePath, variables);

    if (dryRun) {
      logger.info(`\n--- Server: ${server.name} ---`);
      logger.info(`  SSH: ${sshConfig.username}@${sshConfig.host}:${sshConfig.port}`);
      logger.info(`  Local: ${localPath}`);
      logger.info(`  Remote: ${remotePath}`);
      logger.info(`  Exclude: ${server.exclude?.join(', ') ?? '(none)'}`);
      logger.info(`  Preserve: ${server.preserve?.join(', ') ?? '(none)'}`);

      await executeRemoteShell(null as any, server.preDeploy ?? [], variables, 'Pre-deploy', true);
      await executeRemoteShell(null as any, server.postDeploy ?? [], variables, 'Post-deploy', true);
      return { name: server.name, success: true };
    }

    await withSSH(sshConfig, async (ssh) => {
      spinner.succeed(`SSH connection established to ${server.name}`);

      await executeRemoteShell(ssh, server.preDeploy ?? [], variables, 'Pre-deploy');

      await transferFiles(ssh, localPath, remotePath, server.exclude, server.preserve);

      await executeRemoteShell(ssh, server.postDeploy ?? [], variables, 'Post-deploy');
    });

    logger.success(`\nDeployment to ${server.name} complete!`);
    return { name: server.name, success: true };
  } catch (e: any) {
    spinner.fail(`Deployment to ${server.name} failed.`);
    if (e instanceof SimployError) {
      logger.error(e.message);
      return { name: server.name, success: false, error: e.message };
    }
    logger.error(e.message);
    return { name: server.name, success: false, error: e.message };
  }
}