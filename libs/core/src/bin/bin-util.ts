import { exec } from 'child_process';
import ora from 'ora';

export const execAsync = (command: string) => {
  return new Promise<void>((resolve, reject) => {
    exec(command, (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
};

export const npmInstall = async (...packages: string[]) => {
  const packageNames = packages.map((p) => p.replace('-D', '').split('@').slice(0, -1).join('@').trim()).join(', ');
  const spinner = ora(`Installing packages: ${packageNames}`).start();
  const asString = packages.join(' ');
  await execAsync(`npm install ${asString}`);
  spinner.succeed(`Installed packages: ${packageNames}`);
};
