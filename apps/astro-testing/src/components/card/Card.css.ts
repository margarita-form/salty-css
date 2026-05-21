import { styled } from '@salty-css/react/styled';

export const CardRoot = styled('div', {
  base: {
    display: 'inline-block',
    padding: '16px 20px',
    margin: '12px',
    borderRadius: '8px',
    background: 'mediumseagreen',
    color: 'white',
    fontFamily: 'sans-serif',
    cursor: 'pointer',
    userSelect: 'none',
  },
});

export const CardLabel = styled('strong', {
  base: {
    display: 'block',
    fontSize: '14px',
    opacity: 0.85,
    marginBottom: '4px',
  },
});

export const CardCount = styled('span', {
  base: {
    fontSize: '20px',
    fontWeight: 700,
  },
});
