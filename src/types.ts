export interface SSHConfig {
  host: string;
  port: number | string;
  username: string;
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
}

export interface ServerConfig {
  name: string;
  ssh: SSHConfig;
  localPath: string;
  remotePath: string;
  exclude?: string[];
  preserve?: string[];
  preDeploy?: string[];
  postDeploy?: string[];
}

export interface EnvironmentConfig {
  servers: ServerConfig[];
  variables?: Record<string, string>;
}

export interface SimployConfig {
  $schema?: string;
  environments: Record<string, EnvironmentConfig>;
}

export interface DeployOptions {
  configPath?: string;
  secretsConfigPath?: string;
  env: string;
  dryRun?: boolean;
  server?: string;
}