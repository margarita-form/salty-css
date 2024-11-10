// import './saltygen/index.css';

import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  HeadingBase,
  LargeHeading,
  LargeHeadingH1,
} from './components/heading/heading.salty';
import { Wrapper } from './components/wrapper/wrapper.styled';
import {
  Button,
  ButtonsWrapper,
  LargeButton,
} from './components/button/button.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <Wrapper className="theme-light">
      <LargeHeadingH1>Large heading H1</LargeHeadingH1>
      <LargeHeading>Large heading H2</LargeHeading>
      <HeadingBase>Heading base H3</HeadingBase>

      <ButtonsWrapper>
        <Button
          variant="solid"
          borderRadius="regular"
          onClick={() => alert('It is a button.')}
          href="https://google.com"
        >
          Solid
        </Button>
        <Button variant="outlined" onClick={() => alert('It is a button.')}>
          Outlined
        </Button>
      </ButtonsWrapper>

      <ButtonsWrapper>
        <LargeButton
          warning
          disabled
          variant="solid"
          onClick={() => alert('It is a button.')}
        >
          Large and red
        </LargeButton>
      </ButtonsWrapper>
    </Wrapper>
  </StrictMode>
);
