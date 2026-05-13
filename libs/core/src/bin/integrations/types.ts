import { ProjectContext } from '../context';

export interface IntegrationApplyResult {
  /** Whether any file was edited or any install was performed. */
  changed: boolean;
}

export interface BuildIntegrationAdapter {
  name: string;
  /** Returns the config file path this integration targets, or null when not applicable. */
  detect(ctx: ProjectContext): Promise<string | null> | string | null;
  /** Idempotently wire the integration into the project (edit configs, install dev deps). */
  apply(ctx: ProjectContext, configPath: string): Promise<IntegrationApplyResult>;
}

/** Pure transform — returned by an integration when it knows how to rewrite a config file. */
export interface ConfigEdit {
  /** New content to write, or null when no edit is needed. */
  content: string | null;
}
