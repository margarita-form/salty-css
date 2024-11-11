import { useRef } from 'react';
import { ButtonsWrapper, Button, LargeButton } from '../components/button/button.css';
import { LargeHeadingH1, LargeHeading, HeadingBase } from '../components/heading/heading.salty';
import { Wrapper } from '../components/wrapper/wrapper.styled';

export const IndexPage = () => {
  const wrapper = useRef<HTMLElement>(null);

  return (
    <Wrapper className="theme-light" ref={wrapper}>
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
        <LargeButton warning disabled variant="solid" onClick={() => alert('It is a button.')} asd="123">
          Large and red
        </LargeButton>
      </ButtonsWrapper>
    </Wrapper>
  );
};
