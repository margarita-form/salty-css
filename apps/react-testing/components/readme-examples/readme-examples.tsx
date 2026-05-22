import {
  ReadmeButton,
  ReadmeDangerButton,
  ReadmeHeading,
  ReadmeSubheading,
  readmeCard,
} from './readme-examples.css';

export const ReadmeExamplesPage = () => {
  return (
    <main className="readme-examples-root">
      <ReadmeHeading>README examples</ReadmeHeading>
      <ReadmeSubheading>
        Every styled / className / factory below mirrors a snippet in the root README.
      </ReadmeSubheading>

      <div className={readmeCard.variant('tone', 'brand')}>
        <p>Card rendered via the README `className` example.</p>
      </div>

      <ReadmeButton variant="solid" size="lg">
        Solid LG (compound variant)
      </ReadmeButton>
      <ReadmeButton>Outlined SM (default variants)</ReadmeButton>
      <ReadmeDangerButton>Extended button</ReadmeDangerButton>
    </main>
  );
};
