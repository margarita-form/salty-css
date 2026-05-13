import { ProjectContext } from '../context';
import { TemplateKey } from '../templates';

export type FrameworkName = 'react' | 'astro';

export interface ComponentTemplates {
  /** Template used for the styled-file when the wrapper component is requested. */
  styled: TemplateKey;
  /** Template used for the wrapper component file. */
  wrapper: TemplateKey;
  /** Extension for the wrapper component file (including dot), e.g. '.tsx' or '.astro'. */
  wrapperExt: string;
}

export interface FrameworkAdapter {
  name: FrameworkName;
  /** True when this framework matches the project. Adapters are evaluated in registry order. */
  detect(ctx: ProjectContext): Promise<boolean> | boolean;
  /** The runtime npm spec to install for this framework, e.g. `@salty-css/react@1.2.3`. */
  runtimePackage(version: string): string;
  /** Templates used by the `generate` command. */
  templates: {
    /** Template used for a standalone styled-file (no wrapper). */
    styled: TemplateKey;
    /** Optional wrapper component templates. Omit if the framework does not support `--reactComponent`. */
    component?: ComponentTemplates;
  };
}
