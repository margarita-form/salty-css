// import './saltygen/index.css';

import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { IndexPage } from './pages/index-page';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <IndexPage />
  </StrictMode>
);
