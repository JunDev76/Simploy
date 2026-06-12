import chalk from 'chalk';

export function info(message: string): void {
  console.log(chalk.blue(message));
}

export function success(message: string): void {
  console.log(chalk.green(message));
}

export function warn(message: string): void {
  console.log(chalk.yellow(message));
}

export function error(message: string): void {
  console.error(chalk.red(message));
}

export function bold(message: string): void {
  console.log(chalk.bold(message));
}