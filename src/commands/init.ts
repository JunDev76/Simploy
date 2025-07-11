import * as fs from "node:fs";
import * as path from "node:path";

const defaultConfig = {
  environments: {
    dev: {
      servers: [
        {
          name: "web",
          ssh: {
            host: "${DEV_WEB_HOST}",
            port: 22,
            user: "${DEV_WEB_USER}",
            password: "${DEV_WEB_PASSWORD}"
          },
          localPath: ".",
          remotePath: "/home/ubuntu/app",
          transferIgnores: ["node_modules", ".git", ".env"],
          remoteIgnoresWhenClean: [".env"],
          cleanShell: [
            "screen -S app -X quit"
          ],
          shell: [
            "cd /home/ubuntu/app",
            "screen -dmS app",
            "screen -S app -X stuff \"npm ci; npm start\n\""
          ]
        }
      ],
      variables: {
        APP_NAME: "myapp"
      }
    }
  }
};

const defaultPrivate = {
  DEV_WEB_HOST: "",
  DEV_WEB_USER: "",
  DEV_WEB_PASSWORD: ""
};

export function init() {
  const simployPath = path.join(process.cwd(), 'simploy.json');
  console.log(`Created simploy.json at ${simployPath}\nEdit the file to complete the settings.`);
  fs.writeFileSync(simployPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');

  const simployPrivatePath = path.join(process.cwd(), 'simploy.private.json');
  console.log(`\nCreated simploy.private.json at ${simployPrivatePath}\nSensitive values can be stored separately in the \`simploy.private.json\` file. And be careful not to include this file in your repository or anything like that.`);
  fs.writeFileSync(simployPrivatePath, JSON.stringify(defaultPrivate, null, 2), 'utf-8');

  const gitignore = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignore)) {
    const gitignoreText = fs.readFileSync(gitignore, 'utf-8').split('\n');
    if(!gitignoreText.find(t => t === 'simploy.private.json')) {
      const originalGitIgnore = fs.readFileSync(gitignore, 'utf-8');
      fs.writeFileSync(gitignore, `simploy.private.json\n${originalGitIgnore}`, 'utf-8');
      console.log('\nThe .gitignore file exists, and the simploy.private.json file has been added to it.')
    }
  }
}

function migrateStringVars(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\$[VP]\$([A-Z0-9_]+)/g, (_, v) => `\${${v}}`)
  } else if (Array.isArray(obj)) {
    return obj.map(migrateStringVars);
  } else if (typeof obj === 'object' && obj !== null) {
    const out: any = {};
    for (const k in obj) {
      out[k] = migrateStringVars(obj[k]);
    }
    return out;
  }
  return obj;
}

export function migrate() {
  const simployPath = path.join(process.cwd(), 'simploy.json');
  if (!fs.existsSync(simployPath)) {
    console.error('No simploy.json found to migrate.');
    return;
  }
  const raw = fs.readFileSync(simployPath, 'utf-8');
  let legacy;
  try {
    legacy = JSON.parse(raw);
  } catch {
    console.error('simploy.json is not valid JSON.');
    return;
  }
  if (legacy.environments) {
    console.log('simploy.json is already in the new format.');
    return;
  }
  // 변수 패턴 변환
  const migratedLegacy = migrateStringVars(legacy);
  const migrated = {
    environments: {
      dev: {
        servers: [
          {
            name: "default",
            ssh: migratedLegacy.ssh,
            localPath: migratedLegacy.localPath,
            remotePath: migratedLegacy.remotePath,
            transferIgnores: migratedLegacy.transferIgnores,
            remoteIgnoresWhenClean: migratedLegacy.remoteIgnoresWhenClean,
            cleanShell: migratedLegacy.cleanShell,
            shell: migratedLegacy.shell
          }
        ],
        variables: migratedLegacy.variable || {}
      }
    }
  };
  fs.writeFileSync(simployPath + '.bak', raw, 'utf-8');
  fs.writeFileSync(simployPath, JSON.stringify(migrated, null, 2), 'utf-8');
  console.log('simploy.json has been migrated to the new format. Backup saved as simploy.json.bak');
  console.log('Please edit the "name" field of your server in simploy.json as needed.');
}
