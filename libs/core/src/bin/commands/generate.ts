import { Command } from 'commander';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { format as formatPath, join, parse as parsePath } from 'path';
import { pascalCase } from '../../util';
import { buildContext } from '../context';
import { detectFramework, getFramework } from '../frameworks';
import { logError, logger } from '../logger';
import { formatWithPrettier } from '../prettier';
import { getProjectFramework } from '../saltyrc';
import { readTemplate } from '../templates';

interface GenerateOptions {
  file: string;
  dir: string;
  tag: string;
  name?: string;
  className?: string;
  reactComponent?: boolean;
}

export const registerGenerateCommand = (program: Command, defaultProject: string | undefined): void => {
  program
    .command('generate [file] [directory]')
    .alias('g')
    .description('Generate a new component file.')
    .option('-f, --file <file>', 'File to generate.')
    .option('-d, --dir <dir>', 'Project directory to generate the file in.')
    .option('-t, --tag <tag>', 'HTML tag of the component.', 'div')
    .option('-n, --name <name>', 'Name of the component.')
    .option('-c, --className <className>', 'CSS class of the component.')
    .option('-r, --reactComponent', 'Generate a wrapper component file alongside the styled definition.')
    .action(async function (this: Command, _file: string, _dir = defaultProject) {
      const { file = _file, dir = _dir, tag, name, className, reactComponent = false } = this.opts<GenerateOptions>();
      if (!file) return logError('File to generate must be provided. Add it as the first argument after generate command or use the --file option.');
      if (!dir) return logError('Project directory must be provided. Add it as the second argument after generate command or use the --dir option.');

      let ctx;
      try {
        ctx = await buildContext({ dir, requirePackageJson: false });
      } catch (err) {
        return logError(err instanceof Error ? err.message : String(err));
      }

      const rcFramework = getFramework(getProjectFramework(ctx.rcFile, ctx.relativeProjectPath));
      const framework = rcFramework ?? (await detectFramework(ctx));

      const additionalFolders = file.split('/').slice(0, -1).join('/');
      if (additionalFolders) await mkdir(join(ctx.projectDir, additionalFolders), { recursive: true });

      const filePath = join(ctx.projectDir, file);
      const parsedFilePath = parsePath(filePath);
      if (!parsedFilePath.ext) parsedFilePath.ext = '.ts';
      if (!parsedFilePath.name.endsWith('.css')) parsedFilePath.name = parsedFilePath.name + '.css';
      parsedFilePath.base = parsedFilePath.name + parsedFilePath.ext;
      const formattedStyledFilePath = formatPath(parsedFilePath);

      const alreadyExists = await readFile(formattedStyledFilePath, 'utf-8').catch(() => undefined);
      if (alreadyExists !== undefined) {
        logger.error('File already exists: ' + formattedStyledFilePath);
        return;
      }

      let styledComponentName = pascalCase(name || parsedFilePath.base.replace(/\.css\.\w+$/, ''));

      if (reactComponent) {
        if (!framework.templates.component) {
          return logError(`--reactComponent is not supported for the ${framework.name} framework.`);
        }
        const componentName = styledComponentName + 'Component';
        styledComponentName = styledComponentName + 'Wrapper';
        const fileName = parsedFilePath.base.replace(/\.css\.\w+$/, '');
        const { content: wrapperContent } = await readTemplate(framework.templates.component.wrapper, {
          tag,
          componentName,
          styledComponentName,
          className,
          fileName,
        });

        parsedFilePath.name = fileName.replace(/\.css$/, '');
        parsedFilePath.ext = framework.templates.component.wrapperExt;
        parsedFilePath.base = parsedFilePath.name + parsedFilePath.ext;
        const formattedWrapperPath = formatPath(parsedFilePath);
        logger.info('Generating a new file: ' + formattedWrapperPath);
        await writeFile(formattedWrapperPath, wrapperContent);
        await formatWithPrettier(formattedWrapperPath);
      }

      const styledKey = reactComponent && framework.templates.component ? framework.templates.component.styled : framework.templates.styled;
      const { content } = await readTemplate(styledKey, { tag, name: styledComponentName, className });
      logger.info('Generating a new file: ' + formattedStyledFilePath);
      await writeFile(formattedStyledFilePath, content);
      await formatWithPrettier(formattedStyledFilePath);
    });
};
