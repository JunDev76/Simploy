# Simploy

**Simploy** is a simple CI/CD deployment tool for personal and small team use. Deploy your project to remote servers via SSH with minimal configuration.

## Features

- **Easy setup**: One command to create config files, edit and deploy
- **Environment & server support**: Deploy to multiple environments and servers
- **Secret management**: Keep sensitive values in a separate file (auto-added to `.gitignore`)
- **SSH key authentication**: Password or private key based auth
- **Variable substitution**: Use `${VAR}` in any config value, with recursive resolution
- **Dry-run mode**: Preview deployment plan without executing
- **Config validation**: Helpful error messages for invalid config files
- **IDE autocomplete**: `$schema` field for JSON validation and autocomplete

## Installation

### Global (recommended)
```bash
pnpm add -g simploy
# or
npm install -g simploy
```

### One-time usage (no install)
```bash
npx simploy init
npx simploy deploy --env dev
```

## Getting Started

### 1. Create config files
```bash
simploy init
```
Creates two files:
- `simploy.json` — main config (environments, servers, variables)
- `simploy.secrets.json` — secrets (auto-added to `.gitignore`)

### 2. Edit config files

**simploy.json**
```json
{
  "$schema": "https://raw.githubusercontent.com/JunDev76/Simploy/main/dist/schema.json",
  "environments": {
    "dev": {
      "servers": [
        {
          "name": "web",
          "ssh": {
            "host": "${DEV_WEB_HOST}",
            "port": 22,
            "username": "${DEV_WEB_USER}",
            "password": "${DEV_WEB_PASSWORD}"
          },
          "localPath": ".",
          "remotePath": "/home/ubuntu/app",
          "exclude": ["node_modules", ".git", ".env"],
          "preserve": [".env"],
          "preDeploy": ["screen -S app -X quit"],
          "postDeploy": [
            "cd /home/ubuntu/app",
            "screen -dmS app",
            "screen -S app -X stuff \"npm ci; npm start\\n\""
          ]
        }
      ],
      "variables": {
        "APP_NAME": "myapp"
      }
    }
  }
}
```

**simploy.secrets.json**
```json
{
  "DEV_WEB_HOST": "your.server.com",
  "DEV_WEB_USER": "ubuntu",
  "DEV_WEB_PASSWORD": "yourpassword"
}
```

### 3. Deploy
```bash
simploy deploy --env dev
```

## CLI Commands

### `simploy init`
Create `simploy.json` and `simploy.secrets.json` in the current directory.

### `simploy deploy`
Deploy your project to remote servers.

| Option | Description | Default |
|--------|-------------|---------|
| `-e, --env <env>` | Environment to deploy | `dev` |
| `-s, --server <name>` | Deploy to a specific server only | all servers |
| `-c, --config-path <path>` | Path to config file | `simploy.json` |
| `-p, --secrets-path <path>` | Path to secrets config file | `simploy.secrets.json` |
| `--dry-run` | Preview deployment without executing | off |

## `$schema` — IDE Autocomplete & Validation

`simploy init` automatically adds `$schema` to your `simploy.json`. This enables:
- **VS Code**: JSON autocomplete and validation out of the box
- **AI agents**: Understands what Simploy is by following the schema URL
- **Other editors**: Any editor supporting JSON Schema

```json
{
  "$schema": "https://raw.githubusercontent.com/JunDev76/Simploy/main/dist/schema.json"
}
```

## SSH Configuration

Use either password or private key authentication:

```json
{
  "ssh": {
    "host": "your.server.com",
    "port": 22,
    "username": "ubuntu",
    "password": "yourpassword"
  }
}
```

Or with SSH key:
```json
{
  "ssh": {
    "host": "your.server.com",
    "port": 22,
    "username": "ubuntu",
    "privateKeyPath": "~/.ssh/id_rsa",
    "passphrase": "optional-passphrase"
  }
}
```

## Variable Substitution

Use `${VAR_NAME}` in any config value or shell command:

```json
{
  "variables": {
    "APP_NAME": "myapp",
    "HOST": "${IP}:${PORT}",
    "IP": "1.2.3.4",
    "PORT": "8080"
  }
}
```

- Variables are resolved recursively (`${HOST}` → `1.2.3.4:8080`)
- `simploy.secrets.json` values override `variables`
- Undefined variables cause a deployment error
- Circular references are detected and reported

## Config Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | no | JSON Schema URI for IDE autocomplete |
| `name` | string | yes | Server name (used in logs and `--server` filter) |
| `ssh.host` | string | yes | Server hostname or IP |
| `ssh.port` | number | no | SSH port (default: 22) |
| `ssh.username` | string | yes | SSH username |
| `ssh.password` | string | no* | SSH password |
| `ssh.privateKeyPath` | string | no* | Path to SSH private key |
| `ssh.passphrase` | string | no | Passphrase for private key |
| `localPath` | string | yes | Local directory to deploy |
| `remotePath` | string | yes | Remote directory to deploy to |
| `exclude` | string[] | no | Files/dirs to exclude from upload |
| `preserve` | string[] | no | Remote files to preserve during cleanup |
| `preDeploy` | string[] | no | Commands run before file transfer |
| `postDeploy` | string[] | no | Commands run after file transfer |

\* Either `password` or `privateKeyPath` is required.

**Note**: `node_modules`, `.git`, `simploy.json`, `simploy.secrets.json` are always excluded from uploads regardless of `exclude` setting.

## Security

- `simploy.secrets.json` is automatically added to `.gitignore` by `simploy init`
- Never commit `simploy.secrets.json` to version control
- Use `privateKeyPath` instead of `password` for production environments

## Requirements

- Node.js >= 18

## License

ISC