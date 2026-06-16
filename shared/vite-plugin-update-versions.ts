import type { Plugin } from 'vite';

export const updateVersionsPlugin: Plugin = {
  name: 'update-versions',
  apply: 'build',
  closeBundle: async function () {
    const path = await import('node:path');
    const fs = await import('node:fs/promises');

    const libDir = process.cwd();

    const packageJsonPath = path.resolve(libDir, 'package.json');

    try {
      const packageJsonRaw = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonRaw);

      const { version } = packageJson;

      // Loop through all dependencies and update versions
      for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
        if (packageJson[depType]) {
          for (const dep in packageJson[depType]) {
            const isSaltyDep = dep.startsWith('@salty-css/');
            if (isSaltyDep) packageJson[depType][dep] = version;
          }
        }
      }

      // Write the updated package.json back to disk
      const updatedPackageJsonRaw = JSON.stringify(packageJson, null, 2);
      await fs.writeFile(packageJsonPath, updatedPackageJsonRaw, 'utf-8');
    } catch (error) {
      console.error('Error updating versions in package.json:', error);
      throw error;
    }
  },
};
