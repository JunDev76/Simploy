# Simploy (SimpleDeploy)

**Simploy** is a super simple CI/CD deployment tool for personal and small team use. It lets you deploy your project to remote servers via SSH with minimal configuration, supporting environment separation and secret management.

---

## Features
- **Easy setup**: Just edit a config file and deploy
- **Environment/server support**: Deploy to multiple environments and servers
- **Secret management**: Keep sensitive values out of your repo
- **pnpm & npx ready**: Fast install, instant usage

---

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

---

## Getting Started

### 1. Create config files
```bash
simploy init
```
This creates two files:
- `simploy.json` (main config)
- `simploy.private.json` (secrets, auto-added to .gitignore)

### 2. Example: simploy.json
```json
{
  "environments": {
    "dev": {
      "servers": [
        {
          "name": "web",
          "ssh": {
            "host": "${DEV_WEB_HOST}",
            "port": 22,
            "user": "${DEV_WEB_USER}",
            "password": "${DEV_WEB_PASSWORD}"
          },
          "localPath": ".",
          "remotePath": "/home/ubuntu/app",
          "transferIgnores": ["node_modules", ".git", ".env"],
          "remoteIgnoresWhenClean": [".env"],
          "cleanShell": [
            "screen -S app -X quit"
          ],
          "shell": [
            "cd /home/ubuntu/app",
            "screen -dmS app",
            "screen -S app -X stuff \"npm ci; npm start\n\""
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

### 3. Example: simploy.private.json
```json
{
  "DEV_WEB_HOST": "your.server.com",
  "DEV_WEB_USER": "ubuntu",
  "DEV_WEB_PASSWORD": "yourpassword"
}
```

---

## Deploy

```bash
simploy deploy --env dev
# or
npx simploy deploy --env dev
```
- Use `--env` to select environment (default: dev)
- All servers in the environment will be deployed sequentially

---

## CLI Commands
- `simploy init` : Create config files
- `simploy deploy --env <env>` : Deploy to the specified environment

---

## Variable Usage
- Use `${VAR_NAME}` in any config or shell command
- Values are replaced from both `variables` in simploy.json and all keys in simploy.private.json

---

## Security
- `simploy.private.json` is automatically added to `.gitignore` and should never be committed
- Store all secrets (passwords, tokens, etc) in `simploy.private.json`

---

## Contributing
Pull requests and issues are welcome!

---

## License
ISC 