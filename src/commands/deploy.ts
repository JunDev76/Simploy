import loadConfig from "utils/loadConfig";
import replaceVariable, {VariableType} from "utils/replaceVariable";
import {NodeSSH} from "node-ssh";
import SSHTransfer from "utils/SSHTransfer";
import doShell from "utils/doShell";
import ora from 'ora';
import chalk from 'chalk';

export async function deploy(configPath = 'simploy.json', privateConfigPath = 'simploy.private.json', env = 'dev') {
  const mainSpinner = ora('Starting deployment...').start();

  try {
    const config = loadConfig(configPath);
    const privateConfig = loadConfig(privateConfigPath);

    if (!config.environments || !config.environments[env]) {
      throw new Error(`Environment '${env}' not found in simploy.json`);
    }
    const envConfig = config.environments[env];
    const servers = envConfig.servers || [];
    const variables: VariableType = { ...(envConfig.variables || {}), ...privateConfig };

    for (const server of servers) {
      mainSpinner.text = `Deploying to server: ${server.name}`;
      const ssh = new NodeSSH();
      await ssh.connect({
        host: replaceVariable(server.ssh.host, {V: variables}),
        port: Number(replaceVariable(server.ssh.port, {V: variables})),
        username: replaceVariable(server.ssh.user, {V: variables}),
        password: replaceVariable(server.ssh.password, {V: variables})
      });
      mainSpinner.succeed(chalk.green(`SSH connection established to ${server.name}`));

      await doShell(ssh, server.cleanShell, {V: variables}, 'Executing clean-up commands...');

      const transfer = new SSHTransfer(
        ssh,
        replaceVariable(server.localPath, {V: variables}),
        replaceVariable(server.remotePath, {V: variables}),
        server.transferIgnores,
        server.remoteIgnoresWhenClean
      );
      await transfer.startTransfer();

      await doShell(ssh, server.shell, {V: variables}, 'Executing post-deployment commands...');
      ssh.dispose();
      mainSpinner.succeed(chalk.green(`Deployment to ${server.name} complete!`));
    }
    console.log(chalk.bold.blue('\nThe deployment is now complete!'));
  } catch (e: any) {
    mainSpinner.fail(chalk.red('Deployment failed.'));
    console.error(chalk.red(e.message));
  }
}