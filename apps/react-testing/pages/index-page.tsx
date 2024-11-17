import { useEffect, useRef } from 'react';
import { ButtonsWrapper, Button, LargeButton } from '../components/button/button.css';
import { LargeHeadingH1, LargeHeading, HeadingBase } from '../components/heading/heading.salty';
import { Wrapper } from '../components/wrapper/wrapper.styled';

export const IndexPage = () => {
  const wrapper = useRef<HTMLElement>(null);

  useEffect(() => {
    console.log('ref', wrapper);
  }, []);

  return (
    <Wrapper className="theme-light" ref={wrapper} cssValues={{ lorem: 'blue' }}>
      <LargeHeadingH1 id="main-heading">Large heading H1</LargeHeadingH1>
      <LargeHeading>Large heading H2</LargeHeading>
      <HeadingBase>Heading base H3</HeadingBase>

      <ButtonsWrapper>
        <Button variant="solid" borderRadius="regular" onClick={() => alert('It is a button.')} href="https://google.com">
          Solid
        </Button>
        <Button variant="outlined" onClick={() => alert('It is a button.')}>
          Outlined
        </Button>
      </ButtonsWrapper>

      <ButtonsWrapper>
        <LargeButton warning disabled variant="" onClick={() => alert('It is a button.')}>
          Large and red
        </LargeButton>
      </ButtonsWrapper>
    </Wrapper>
  );
};
