import { astroFramework, reactFramework } from '../frameworks';
import { upsertProjectInRc } from '../saltyrc';

describe('upsertProjectInRc', () => {
  it('creates a fresh saltyrc when none exists', () => {
    const { content, changed, created } = upsertProjectInRc(undefined, 'apps/web', reactFramework);
    expect(created).toBe(true);
    expect(changed).toBe(true);
    const parsed = JSON.parse(content);
    expect(parsed.defaultProject).toBe('apps/web');
    expect(parsed.projects).toEqual([{ dir: 'apps/web', framework: 'react' }]);
    expect(parsed.$schema).toBe('./node_modules/@salty-css/core/.saltyrc.schema.json');
  });

  it('appends a new project entry when missing', () => {
    const existing = JSON.stringify({ defaultProject: 'apps/web', projects: [{ dir: 'apps/web', framework: 'react' }] });
    const { content, changed, created } = upsertProjectInRc(existing, 'apps/site', astroFramework);
    expect(created).toBe(false);
    expect(changed).toBe(true);
    const parsed = JSON.parse(content);
    expect(parsed.projects).toHaveLength(2);
    expect(parsed.projects[1]).toEqual({ dir: 'apps/site/src', framework: 'astro' });
  });

  it('is a no-op when the project already exists (preserves existing framework)', () => {
    const existing = JSON.stringify({ defaultProject: 'apps/web', projects: [{ dir: 'apps/web', framework: 'react' }] }, null, 2);
    const { content, changed } = upsertProjectInRc(existing, 'apps/web', reactFramework);
    expect(changed).toBe(false);
    expect(content).toBe(existing);
    const parsed = JSON.parse(content);
    expect(parsed.projects[0].framework).toBe('react');
  });
});
