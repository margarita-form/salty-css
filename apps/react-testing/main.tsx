// import './saltygen/index.css';

import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { LargeHeadingH1 } from './components/heading/heading.salty';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <LargeHeadingH1>Hello World</LargeHeadingH1>
  </StrictMode>
);
