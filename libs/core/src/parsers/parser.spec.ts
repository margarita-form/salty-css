import { parseStyles } from './index';

describe('Parser testing', () => {
  it('parse flat styles', async () => {
    const [styles] = await parseStyles({ color: 'red' });
    expect(styles.replace(/\s/g, '')).toBe('color: red;'.replace(/\s/g, ''));
  });
  it('parse styles with class name', async () => {
    const [styles] = await parseStyles({ color: 'red' }, '.lorem');
    expect(styles.replace(/\s/g, '')).toBe('.lorem { color: red; }'.replace(/\s/g, ''));
  });
  it('parse flat styles 2', async () => {
    const styles = await parseStyles({
      color: 'red',
      background: async () => 'blue',
      borderColor: new Promise((resolve) => resolve('yellow')),
      width: 100,
      '.childClass': {
        color: 'blue',
      },
      '.jasso': async () => ({
        color: 'green',
        width: Math.round(Math.random() * 100),
      }),
    });

    console.log(styles);

    // expect(styles.replace(/\s/g, '')).toBe('color: red;'.replace(/\s/g, ''));
  });
});
