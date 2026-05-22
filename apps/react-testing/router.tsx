import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { IndexPage } from './pages/index-page';
import { ReadmeExamplesPage } from './components/readme-examples/readme-examples';
import { useMemo } from 'react';

const createRouter = () =>
  createBrowserRouter([
    {
      path: '/',
      element: <IndexPage />,
    },
    {
      path: '/readme-examples',
      element: <ReadmeExamplesPage />,
    },
  ]);

export function Router() {
  const router = useMemo(() => createRouter(), []);
  return <RouterProvider router={router} />;
}
