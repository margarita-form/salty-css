import { styled } from '@salty-css/react/styled';
import { fadeIn } from '../../styles/animations.css';

export const Wrapper = styled('div', {
  base: {
    display: 'block',
    animation: fadeIn,
    backgroundColor: '{theme.background.color}',
    padding: '{spacings.screen.small}',
    margin: '{spacings.screen.medium}',
    maxWidth: '{sizes.width.medium}',
  },
});
