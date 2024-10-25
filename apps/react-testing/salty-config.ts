const generateRandom = () => Math.random().toString(36).substring(7);

export const config = {
  variables: {
    primaryColor: '#FF0000',
    randomString: generateRandom(),
  },
};
