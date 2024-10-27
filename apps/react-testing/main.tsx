// import './saltygen/index.css';

import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  HeadingBase,
  LargeHeading,
  LargeHeadingH1,
} from './components/heading/heading.salty';
import { Wrapper } from './components/wrapper/wrapper.salty';
import { Button, ButtonsWrapper } from './components/button/button.salty';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <Wrapper>
      <LargeHeadingH1>Large heading H1</LargeHeadingH1>
      <LargeHeading>Large heading H2</LargeHeading>
      <HeadingBase>Heading base H3</HeadingBase>

      <ButtonsWrapper>
        <Button variant="solid" onClick={() => alert('It is a button.')}>
          Solid
        </Button>
        <Button variant="outlined" onClick={() => alert('It is a button.')}>
          Outlined
        </Button>
      </ButtonsWrapper>
    </Wrapper>
  </StrictMode>
);
