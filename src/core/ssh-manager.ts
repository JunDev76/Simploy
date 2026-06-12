import fs from 'node:fs';
import { NodeSSH } from 'node-ssh';
import { SSHError } from '../errors.js';
import type { SSHConfig } from '../types.js';

export async function withSSH<T>(config: SSHConfig, fn: (ssh: NodeSSH) => Promise<T>): Promise<T> {
  const ssh = new NodeSSH();

  try {
    const connectOptions: Record<string, unknown> = {
      host: config.host,
      port: config.port,
      username: config.username,
    };

    if (config.privateKeyPath) {
      const keyPath = config.privateKeyPath.replace(/^~/, process.env.HOME || '~');
      if (!fs.existsSync(keyPath)) {
        throw new SSHError(`SSH private key not found: ${keyPath}`);
      }
      connectOptions.privateKeyPath = keyPath;
      if (config.passphrase) {
        connectOptions.passphrase = config.passphrase;
      }
    } else if (config.password) {
      connectOptions.password = config.password;
    }

    try {
      await ssh.connect(connectOptions);
    } catch (e: any) {
      throw new SSHError(`Failed to connect to ${config.host}:${config.port} - ${e.message}`);
    }

    return await fn(ssh);
  } finally {
    ssh.dispose();
  }
}