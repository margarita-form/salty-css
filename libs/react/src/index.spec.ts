import * as reactEntry from './index';
import * as styledEntry from './styled';
import * as classNameEntry from './class-name';
import * as keyframesEntry from './keyframes';
import * as mediaEntry from './media';

describe('@salty-css/react public entry points', () => {
  it('re-exports the core css helpers from the index', () => {
    expect(typeof reactEntry.token).toBe('function');
    expect(typeof reactEntry.keyframes).toBe('function');
    expect(typeof reactEntry.mergeObjects).toBe('function');
    expect(reactEntry.media).toBeDefined();
  });

  it('exposes styled() from the /styled entry', () => {
    expect(typeof styledEntry.styled).toBe('function');
  });

  it('exposes className() from the /class-name entry', () => {
    expect(typeof classNameEntry.className).toBe('function');
  });

  it('re-exports keyframes from the /keyframes entry', () => {
    expect(typeof keyframesEntry.keyframes).toBe('function');
  });

  it('re-exports the media factory from the /media entry', () => {
    expect(mediaEntry.media).toBeDefined();
  });
});
