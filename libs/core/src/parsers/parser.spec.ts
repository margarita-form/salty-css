import { parseStyles } from './index';

describe('Parser testing', () => {
  it('parse flat styles', async () => {
    const [styles] = await parseStyles({ color: 'red' });
    expect(styles.replace(/\s/g, '')).toBe('color: red;'.replace(/\s/g, ''));
  });
  it('parse styles with class name', async () => {
    const [styles] = await parseStyles({ color: 'red' }, '.wrapper');
    expect(styles.replace(/\s/g, '')).toBe('.wrapper { color: red; }'.replace(/\s/g, ''));
  });
  it('parse styles with tag selector', async () => {
    const [styles] = await parseStyles({ color: 'red' }, 'main');
    expect(styles.replace(/\s/g, '')).toBe('main { color: red; }'.replace(/\s/g, ''));
  });
  it('parse styles with id selector', async () => {
    const [styles] = await parseStyles({ color: 'red' }, '#section');
    expect(styles.replace(/\s/g, '')).toBe('#section { color: red; }'.replace(/\s/g, ''));
  });
});
