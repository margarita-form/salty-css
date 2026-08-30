import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { renderAstroComponent } from './astro-template';

// renderAstroComponent reads `<destDir>/astro/<configFile>`; give each case a real
// config file on disk and assert on the generated `.astro` component source.
describe('renderAstroComponent', () => {
  let destDir: string;

  const writeConfig = async (fileName: string, config: Record<string, unknown>) => {
    await writeFile(join(destDir, 'astro', fileName), JSON.stringify(config), 'utf-8');
    return renderAstroComponent(destDir, fileName);
  };

  beforeAll(async () => {
    destDir = await mkdtemp(join(tmpdir(), 'salty-astro-'));
    await mkdir(join(destDir, 'astro'), { recursive: true });
  });

  afterAll(async () => {
    await rm(destDir, { recursive: true, force: true });
  });

  it('returns undefined when the config file cannot be read', async () => {
    const result = await renderAstroComponent(destDir, 'does-not-exist.config');
    expect(result).toBeUndefined();
  });

  it('renders template (text style) classes into the base class list of an intrinsic element', async () => {
    const classNames = 'abc123 t_deadbeef color-red';
    const result = await writeConfig('intrinsic.config', {
      tagName: 'h1',
      tagIsComponent: false,
      classNames,
      clientProps: { hash: 'abc123' },
    });

    // The template class is passed as the base className argument to resolveAstroProps,
    // which puts it on class:list — this is what applies the text style at runtime.
    expect(result).toContain(JSON.stringify(classNames));
    expect(result).toContain('resolveAstroProps(Astro.props, __cp');
    expect(result).toContain('class:list={__r.class}');
    // Intrinsic tag resolves through the runtime element override, falling back to the tag.
    expect(result).toContain('__r.element ||');
    expect(result).toContain('"h1"');
    // Not extending a component, so nothing is forwarded onto the element.
    expect(result).not.toContain('_vks={__r._vks}');
    expect(result).not.toContain('element={__r.element}');
  });

  it('forwards element and _vks when extending a styled component', async () => {
    const result = await writeConfig('nested.config', {
      tagName: 'Wrapper',
      tagIsComponent: true,
      extendsStyled: true,
      classNames: 'abc123',
      clientProps: { hash: 'abc123' },
      imports: ["import Wrapper from './wrapper.css.ts.astro?configFile=xyz.config';"],
    });

    // Extended styled component becomes the element directly.
    expect(result).toContain('const Element = Wrapper;');
    // extendsStyled is threaded into resolveAstroProps so consumed vks are kept.
    expect(result).toContain('resolveAstroProps(Astro.props, __cp,');
    expect(result).toContain(', true)');
    // Both element and _vks are forwarded to the inner styled component.
    expect(result).toContain('element={__r.element}');
    expect(result).toContain('_vks={__r._vks}');
    // User import is included in the frontmatter.
    expect(result).toContain("import Wrapper from './wrapper.css.ts.astro?configFile=xyz.config';");
  });

  it('forwards element but not _vks when extending a non-styled component', async () => {
    const result = await writeConfig('plain.config', {
      tagName: 'PlainComponent',
      tagIsComponent: true,
      extendsStyled: false,
      classNames: 'abc123',
      clientProps: { hash: 'abc123' },
    });

    expect(result).toContain('element={__r.element}');
    expect(result).not.toContain('_vks={__r._vks}');
    // Not extending styled → false is threaded through.
    expect(result).toContain(', false)');
  });
});
