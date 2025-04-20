import { styled } from '@salty-css/react/styled';
import { className } from '@salty-css/react/class-name';
import { fadeIn } from '../../styles/animations.css';
import { hdClamp } from '../../styles/helpers.css';

export const Wrapper = styled('div', {
  base: {
    display: 'block',
    animation: fadeIn,
    backgroundColor: '{theme.background.color}',
    padding: '{spacings.screen.small}',
    margin: '{spacings.screen.medium}',
    maxWidth: hdClamp(960),
  },
});

export const notificationClass = className({
  base: {
    background: '#ffd600',
    padding: '{spacings.medium}',
    color: 'black',
    marginBottom: '{spacings.medium}',
    fontWeight: '600',
    letterSpacing: '0.02em',
  },
  variants: {
    type: {
      error: {
        background: 'red',
      },
      success: {
        background: 'green',
      },
    },
  },
});
