// import './saltygen/index.css';

import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { LargeHeading } from './components/heading/heading.salty';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <LargeHeading>Hello World</LargeHeading>
  </StrictMode>
);
