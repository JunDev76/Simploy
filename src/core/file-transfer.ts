import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { NodeSSH } from 'node-ssh';
import archiver from 'archiver';
import { DeployError } from '../errors.js';
import { createSpinner } from '../utils/spinner.js';

const DEFAULT_EXCLUDES = ['node_modules', '.git', 'simploy.json', 'simploy.secrets.json'];

export async function transferFiles(
  ssh: NodeSSH,
  localPath: string,
  remotePath: string,
  exclude?: string[],
  preserve?: string[],
): Promise<void> {
  const resolvedLocalPath = path.resolve(process.cwd(), localPath);
  const excludes = [...DEFAULT_EXCLUDES, ...(exclude ?? [])];
  const tempZipFile = path.join(os.tmpdir(), `simploy-deploy-${Date.now()}.zip`);

  try {
    await compressDirectory(resolvedLocalPath, tempZipFile, excludes);

    if (preserve && preserve.length > 0) {
      await cleanRemote(ssh, remotePath, preserve);
    } else {
      const spinner = createSpinner('Cleaning up previous files...');
      const result = await ssh.execCommand(`rm -rf ${remotePath}/*`);
      if (result.code !== 0) {
        spinner.fail(`Failed to clean up: ${result.stderr}`);
        throw new DeployError(`Failed to clean remote directory: ${result.stderr}`);
      }
      spinner.succeed('Cleaned up previous files.');
    }

    await uploadFile(ssh, tempZipFile, remotePath);
    await extractRemote(ssh, remotePath);
    await removeRemoteFile(ssh, `${remotePath}/simploy-deploy-temp.zip`);
  } finally {
    try {
      if (fs.existsSync(tempZipFile)) {
        fs.unlinkSync(tempZipFile);
      }
    } catch {
      // best effort cleanup
    }
  }
}

async function compressDirectory(
  localDir: string,
  outputPath: string,
  excludes: string[],
): Promise<void> {
  const spinner = createSpinner('Compressing files...');

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      spinner.succeed(`Compression complete. Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
      resolve();
    });

    archive.on('error', (err) => {
      spinner.fail('Compression failed.');
      reject(new DeployError(`Compression failed: ${err.message}`));
    });

    archive.pipe(output);

    const addFiles = (dir: string, base: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (excludes.includes(item)) continue;
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(base, fullPath);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          addFiles(fullPath, base);
        } else if (stats.isFile()) {
          archive.file(fullPath, { name: relativePath });
        }
      }
    };

    addFiles(localDir, localDir);
    archive.finalize();
  });
}

async function cleanRemote(
  ssh: NodeSSH,
  remotePath: string,
  preserve: string[],
): Promise<void> {
  const spinner = createSpinner('Cleaning up previous files...');
  const ignorePattern = preserve
    .map((item) => `-name "${item}"`)
    .join(' -o ');
  const result = await ssh.execCommand(
    `find ${remotePath} -mindepth 1 \\( ${ignorePattern} \\) -prune -o -exec rm -rf {} +`,
  );
  if (result.code !== 0) {
    spinner.fail(`Failed to clean up: ${result.stderr}`);
    throw new DeployError(`Failed to clean remote directory: ${result.stderr}`);
  }
  spinner.succeed('Cleaned up previous files.');
}

async function uploadFile(
  ssh: NodeSSH,
  localFilePath: string,
  remotePath: string,
): Promise<void> {
  const spinner = createSpinner('Uploading... 0.00%');
  const remoteZipPath = `${remotePath.replace(/\/$/, '')}/simploy-deploy-temp.zip`;

  await ssh.putFile(localFilePath, remoteZipPath, null, {
    step: (transferred, _chunk, total) => {
      spinner.text = `Uploading... ${((transferred / total) * 100).toFixed(2)}%`;
    },
  });

  spinner.succeed('File transfer complete.');
}

async function extractRemote(ssh: NodeSSH, remotePath: string): Promise<void> {
  const spinner = createSpinner('Extracting files on remote server...');
  const remoteZipPath = `${remotePath.replace(/\/$/, '')}/simploy-deploy-temp.zip`;
  const result = await ssh.execCommand(`unzip -o ${remoteZipPath} -d ${remotePath}`);

  if (result.code !== 0) {
    spinner.fail('Extraction failed.');
    throw new DeployError(`Failed to extract files: ${result.stderr}`);
  }

  spinner.succeed('Extraction complete.');
}

async function removeRemoteFile(ssh: NodeSSH, remoteFilePath: string): Promise<void> {
  const spinner = createSpinner('Removing temporary file on remote server...');
  const result = await ssh.execCommand(`rm -f ${remoteFilePath}`);

  if (result.code !== 0) {
    spinner.fail('Failed to remove temporary file.');
    return;
  }

  spinner.succeed('Removed temporary file.');
}