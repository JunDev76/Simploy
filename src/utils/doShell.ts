import {NodeSSH} from "node-ssh";
import replaceVariable from "utils/replaceVariable";
import ora from 'ora';
import chalk from 'chalk';

export default async function doShell(ssh: NodeSSH, shells: string[], variables: any, text = 'Shell...') {
  if (!shells || shells.length === 0) {
    return;
  }

  console.log(chalk.blue(text));

  const processedShells = shells.map(shell => replaceVariable(shell, variables));
  const singleCommand = processedShells.join(' && ');

  const spinner = ora(`Executing: ${singleCommand}`).start();

  const result = await ssh.execCommand(singleCommand);

  if (result.code === 0) {
    spinner.succeed(chalk.green(`Execution finished: ${singleCommand}`));
  } else {
    spinner.fail(chalk.red(`Execution failed: ${singleCommand}`));
    if (result.stdout) {
      console.log(chalk.yellow('stdout:\n') + chalk.gray(result.stdout));
    }
    if (result.stderr) {
      console.error(chalk.red('stderr:\n') + chalk.red(result.stderr));
    }
  }
}