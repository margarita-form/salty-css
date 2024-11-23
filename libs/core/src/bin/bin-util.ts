import { exec } from 'child_process';

export const execAsync = (command: string) => {
  return new Promise<void>((resolve, reject) => {
    exec(command, (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
};
