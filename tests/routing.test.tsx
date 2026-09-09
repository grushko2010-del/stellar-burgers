import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import App from '../src/components/app/app';
import { createAppStore } from '../src/services/store';

const ingredient = {
  _id: 'bun',
  name: 'Космическая булка',
  type: 'bun',
  price: 100,
  proteins: 10,
  fat: 2,
  carbohydrates: 20,
  calories: 150,
  image: '/bun.png',
  image_large: '/bun.png',
  image_mobile: '/bun.png'
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid='path'>{location.pathname}</output>;
}

function openApp(path: string) {
  global.fetch = jest.fn().mockImplementation(async (url: string) => ({
    ok: true,
    json: async () => ({
      success: true,
      data: [ingredient],
      orders: url.endsWith('/orders/42')
        ? [
            {
              _id: 'order',
              number: 42,
              name: 'Заказ с двумя булками',
              status: 'done',
              ingredients: ['bun', 'bun'],
              createdAt: '2026-09-09T10:00:00Z',
              updatedAt: '2026-09-09T10:00:00Z'
            }
          ]
        : [],
      total: 0,
      totalToday: 0
    })
  }));
  return render(
    <Provider store={createAppStore()}>
      <MemoryRouter initialEntries={[path]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    </Provider>
  );
}

afterEach(cleanup);

test('ingredient click opens a routed dialog and Escape restores the constructor URL', async () => {
  openApp('/');
  fireEvent.click(await screen.findByText('Космическая булка'));
  expect(await screen.findByRole('dialog')).toHaveTextContent(
    'Космическая булка'
  );
  expect(screen.getByTestId('path')).toHaveTextContent('/ingredients/bun');
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  );
  expect(screen.getByTestId('path').textContent).toBe('/');
});

test('direct ingredient URLs render a standalone page and missing IDs terminate loading', async () => {
  openApp('/ingredients/bun');
  expect(await screen.findByText('Космическая булка')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  cleanup();
  openApp('/ingredients/missing');
  expect(await screen.findByText('Ингредиент не найден')).toBeInTheDocument();
});

test('a private direct order URL asks a guest to log in', async () => {
  openApp('/profile/orders/42');
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent('/login')
  );
  expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
});

test('guest checkout preserves the burger while moving to the login form', async () => {
  openApp('/');
  fireEvent.click(await screen.findByText('Добавить'));
  fireEvent.click(screen.getByRole('button', { name: 'Оформить заказ' }));
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent('/login')
  );
  expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
});

test('a public order URL loads details through the real store without a dialog', async () => {
  openApp('/feed/42');
  expect(await screen.findByText('Заказ с двумя булками')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Выполнен')).toBeInTheDocument();
});
