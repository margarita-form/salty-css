const generateRandom = () => Math.random().toString(36).substring(7);

export const config = {
  variables: {
    colors: {
      brand: 'red',
      highlight: 'yellow',
    },
    fontSize: {
      heading: {
        regular: '2.5vw',
      },
    },
    custom: {
      variables: {
        thatCanGoDeep: 'blue',
      },
    },
    spacings: {
      emLarge: '1.2em',
      emRegular: '0.6em',
    },
  },
};
