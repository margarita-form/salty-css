import { Command } from 'commander';
import { registerBuildCommand } from './commands/build';
import { registerGenerateCommand } from './commands/generate';
import { registerInitCommand } from './commands/init';
import { registerUpdateCommand } from './commands/update';
import { registerVersionOption } from './commands/version';
import { getDefaultProject } from './saltyrc';

/**
 * Commands:
 * - init [directory] — Initialize a new Salty CSS project.
 * - build [directory] — Build the Salty CSS project.
 * - generate [file] [directory] — Generate a new component file.
 * - update [version] — Update Salty CSS packages to the latest or specified version.
 * - version — Show the current version of Salty CSS.
 */
export async function main() {
  const program = new Command();
  program.name('salty-css').description('Salty-CSS CLI tool to help with annoying configuration tasks.');

  const defaultProject = await getDefaultProject();

  registerInitCommand(program);
  registerBuildCommand(program, defaultProject);
  registerGenerateCommand(program, defaultProject);
  registerUpdateCommand(program);
  registerVersionOption(program);

  program.parseAsync(process.argv);
}
