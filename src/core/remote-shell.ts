import { NodeSSH } from 'node-ssh';
import { SSHError } from '../errors.js';
import { resolveVariables } from './variable-resolver.js';
import { createSpinner } from '../utils/spinner.js';

export async function executeRemoteShell(
  ssh: NodeSSH,
  commands: string[],
  variables: Record<string, string>,
  label: string,
  dryRun = false,
): Promise<void> {
  if (!commands || commands.length === 0) return;

  const resolved = commands.map((cmd) => resolveVariables(cmd, variables));

  if (dryRun) {
    console.log(`[dry-run] ${label}:`);
    resolved.forEach((cmd) => console.log(`  $ ${cmd}`));
    return;
  }

  const script = ['set -e', ...resolved].join('\n');
  const spinner = createSpinner(`${label}...`);

  const result = await ssh.execCommand('bash -s', { stdin: script });

  if (result.code !== 0) {
    spinner.fail(`${label} failed`);
    if (result.stderr) {
      console.error(result.stderr);
    }
    throw new SSHError(`Remote command failed (exit code ${result.code})`);
  }

  spinner.succeed(`${label} complete`);
}