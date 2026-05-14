import { ProjectContext } from '../context';

export interface IntegrationApplyResult {
  /** Whether any file was edited or any install was performed. */
  changed: boolean;
}

/**
 * Pending integration work — the packages it would like installed and a
 * closure that writes the config edits once the install (if any) has run.
 */
export interface IntegrationPlan {
  /** Packages to install, using the same `npmInstall` shorthand (e.g. `'-D @salty-css/vite@1.2.3'`). */
  packages: string[];
  execute(): Promise<IntegrationApplyResult>;
}

export interface BuildIntegrationAdapter {
  name: string;
  /** Returns the config file path this integration targets, or null when not applicable. */
  detect(ctx: ProjectContext): Promise<string | null> | string | null;
  /**
   * Idempotently produce the work needed to wire the integration in. Returns
   * null when the integration is already wired (nothing to do).
   */
  plan(ctx: ProjectContext, configPath: string): Promise<IntegrationPlan | null>;
}

/** Pure transform — returned by an integration when it knows how to rewrite a config file. */
export interface ConfigEdit {
  /** New content to write, or null when no edit is needed. */
  content: string | null;
}
