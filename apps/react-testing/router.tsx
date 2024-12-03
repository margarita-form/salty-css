import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { IndexPage } from './pages/index-page';
import { useMemo } from 'react';

const createRouter = () =>
  createBrowserRouter([
    {
      path: '/',
      element: <IndexPage />,
    },
  ]);

export function Router() {
  const router = useMemo(() => createRouter(), []);
  return <RouterProvider router={router} />;
}
