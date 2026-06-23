import { useState } from 'react';
import { CardCount, CardLabel, CardRoot } from './Card.css';

export const Card = () => {
  const [count, setCount] = useState(0);
  return (
    <CardRoot onClick={() => setCount((c) => c + 1)}>
      <CardLabel>React island (click me)</CardLabel>
      <CardCount>{count}</CardCount>
    </CardRoot>
  );
};

export default Card;
