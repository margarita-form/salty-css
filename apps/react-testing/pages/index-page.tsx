import { useRef } from 'react';
import { ButtonsWrapper, Button } from '../components/button/button.css';
import { CommonHeading, MainHeading } from '../components/heading/heading.salty';
import { Wrapper } from '../components/wrapper/wrapper.styled';
import { Body } from '../components/body/body.css';

export const IndexPage = () => {
  const wrapper = useRef<HTMLDivElement>(null);

  return (
    <Wrapper className="theme-darkAlt" ref={wrapper}>
      <MainHeading>Salty CSS react testing</MainHeading>

      <Body>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce malesuada lacus eu tortor rhoncus porttitor. Vestibulum lobortis cursus eros sit amet
        congue. Curabitur non nisl finibus diam euismod auctor vitae vel magna. Mauris vestibulum, tortor vitae suscipit tristique, sem lectus malesuada quam,
        eget sodales neque ex in magna. Suspendisse pulvinar ultricies arcu, ut faucibus nunc lacinia et. Praesent porttitor fringilla lobortis.
      </Body>

      <ButtonsWrapper>
        <Button variant="solid" onClick={() => alert('It is a solid button.')}>
          Solid
        </Button>
        <Button variant="outlined" onClick={() => alert('It is an outlined button.')}>
          Outlined
        </Button>
      </ButtonsWrapper>

      <CommonHeading>Go to the website</CommonHeading>

      <Body style={{ marginBottom: '1em' }}>
        Eget sodales neque ex in magna. Suspendisse pulvinar ultricies arcu, ut faucibus nunc lacinia et. Praesent porttitor fringilla lobortis.
      </Body>

      <Button variant="underlined" href="https://salty-css.dev">
        Outlined
      </Button>
    </Wrapper>
  );
};
