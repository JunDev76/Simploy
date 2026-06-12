import type { SimployConfig } from './types.js';

export const SCHEMA_URL = 'https://raw.githubusercontent.com/JunDev76/Simploy/main/dist/schema.json';

export const DEFAULT_CONFIG: SimployConfig = {
  $schema: SCHEMA_URL,
  environments: {
    dev: {
      servers: [
        {
          name: 'web',
          ssh: {
            host: '${DEV_WEB_HOST}',
            port: 22,
            username: '${DEV_WEB_USER}',
            password: '${DEV_WEB_PASSWORD}',
          },
          localPath: '.',
          remotePath: '/home/ubuntu/app',
          exclude: ['node_modules', '.git', '.env'],
          preserve: ['.env'],
          preDeploy: ['screen -S app -X quit'],
          postDeploy: [
            'cd /home/ubuntu/app',
            'screen -dmS app',
            'screen -S app -X stuff "npm ci; npm start\\n"',
          ],
        },
      ],
      variables: {
        APP_NAME: 'myapp',
      },
    },
  },
};

export const DEFAULT_SECRETS_CONFIG: Record<string, string> = {
  DEV_WEB_HOST: '',
  DEV_WEB_USER: '',
  DEV_WEB_PASSWORD: '',
};

export const CONFIG_FILE_NAME = 'simploy.json';
export const SECRETS_CONFIG_FILE_NAME = 'simploy.secrets.json';