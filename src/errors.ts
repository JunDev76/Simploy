export class SimployError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SimployError';
  }
}

export class ConfigError extends SimployError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class SSHError extends SimployError {
  constructor(message: string) {
    super(message);
    this.name = 'SSHError';
  }
}

export class DeployError extends SimployError {
  constructor(message: string) {
    super(message);
    this.name = 'DeployError';
  }
}

export class VariableError extends SimployError {
  constructor(message: string) {
    super(message);
    this.name = 'VariableError';
  }
}