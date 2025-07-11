import {NodeSSH} from "node-ssh";
import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";
import * as os from "os";
import ora from "ora";
import chalk from "chalk";

export default class SSHTransfer {

  protected tempZipFile: string;

  constructor(
    protected ssh: NodeSSH,
    protected localPath: string,
    protected remoteDir: string,
    protected excludeList: string[],
    protected remoteIgnoresWhenClean: string[]
  ) {
    excludeList.push('simploy.json', 'simploy.private.json');
    this.tempZipFile = path.join(os.tmpdir(), `deploy-${Date.now()}.zip`);
  }

  async compressDirectory(localDir: string): Promise<string> {
    const spinner = ora('Compressing files...').start();
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(this.tempZipFile);
      const archive = archiver('zip', {
        zlib: {level: 9}
      });

      output.on('close', () => {
        spinner.succeed(chalk.green(`Compression complete. Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`));
        resolve(this.tempZipFile);
      });

      archive.on('error', (err) => {
        spinner.fail(chalk.red('Compression failed.'));
        reject(err);
      });

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn(err);
        } else {
          reject(err);
        }
      });

      archive.pipe(output);

      const addFilesToArchive = (dir: string, baseDir: string) => {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          if (this.excludeList.includes(item)) continue;

          const fullPath = path.join(dir, item);
          const relativePath = path.relative(baseDir, fullPath);
          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            addFilesToArchive(fullPath, baseDir);
          } else if (stats.isFile()) {
            archive.file(fullPath, {name: relativePath});
          }
        }
      };

      addFilesToArchive(localDir, localDir);
      archive.finalize();
    });
  }

  async uploadAndExtract(): Promise<void> {
    try {
      const localDir = path.resolve(process.cwd(), this.localPath);
      const remoteDir = this.remoteDir;
      const remoteZipPath = `${remoteDir}/deploy-temp.zip`;

      await this.compressDirectory(localDir);

      const cleanupSpinner = ora('Cleaning up previous files...').start();
      const ignorePattern = this.remoteIgnoresWhenClean.map(item => `-name "${item}"`).join(' -o ');
      const cleanupResult = await this.ssh.execCommand(`find ${remoteDir} -mindepth 1 \\( ${ignorePattern} \\) -prune -o -exec rm -rf {} +`);
      if (cleanupResult.code === 0) {
        cleanupSpinner.succeed(chalk.green('Cleaned up previous files.'));
      } else {
        cleanupSpinner.fail(chalk.red('Failed to clean up previous files.'));
        if (cleanupResult.stdout) {
          console.log(chalk.yellow('stdout:\n') + chalk.gray(cleanupResult.stdout));
        }
        if (cleanupResult.stderr) {
          console.error(chalk.red('stderr:\n') + chalk.red(cleanupResult.stderr));
        }
      }

      const uploadSpinner = ora('Starting file transfer...').start();
      const fileSize = fs.statSync(this.tempZipFile).size;
      let transferred = 0;
      uploadSpinner.text = `Uploading... 0.00%`;

      await this.ssh.putFile(this.tempZipFile, remoteZipPath, null, {
        step: (totalTransferred, chunk, total) => {
          transferred = totalTransferred;
          const percentage = (transferred / total * 100).toFixed(2);
          uploadSpinner.text = `Uploading... ${percentage}%`;
        }
      });

      uploadSpinner.succeed(chalk.green('File transfer complete.'));

      const extractSpinner = ora('Extracting files on remote server...').start();
      const extractResult = await this.ssh.execCommand(`unzip -o ${remoteZipPath} -d ${remoteDir}`);
      if (extractResult.code === 0) {
        extractSpinner.succeed(chalk.green('Extraction complete.'));
      } else {
        extractSpinner.fail(chalk.red('Extraction failed.'));
        if (extractResult.stdout) {
          console.log(chalk.yellow('stdout:\n') + chalk.gray(extractResult.stdout));
        }
        if (extractResult.stderr) {
          console.error(chalk.red('stderr:\n') + chalk.red(extractResult.stderr));
        }
      }

      const rmSpinner = ora('Removing temporary file on remote server...').start();
      const rmResult = await this.ssh.execCommand(`rm ${remoteZipPath}`);
      if (rmResult.code === 0) {
        rmSpinner.succeed(chalk.green('Removed temporary file.'));
      } else {
        rmSpinner.fail(chalk.red('Failed to remove temporary file.'));
        if (rmResult.stdout) {
          console.log(chalk.yellow('stdout:\n') + chalk.gray(rmResult.stdout));
        }
        if (rmResult.stderr) {
          console.error(chalk.red('stderr:\n') + chalk.red(rmResult.stderr));
        }
      }
      fs.unlinkSync(this.tempZipFile);

      console.log(chalk.bold.green("\nAll files have been successfully transferred and extracted!"));
    } catch (error) {
      console.error(chalk.red(error));

      try {
        if (fs.existsSync(this.tempZipFile)) {
          fs.unlinkSync(this.tempZipFile);
        }
      } catch (cleanupError) {
        console.error(chalk.red('Failed to clean up temporary file:'), cleanupError);
      }
    }
  }

  async startTransfer(): Promise<void> {
    await this.uploadAndExtract();
  }
}