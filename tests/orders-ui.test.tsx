import { render, screen } from '@testing-library/react';
import { FeedUI } from '../src/components/ui/pages/feed';
import { ProfileOrdersUI } from '../src/components/ui/pages/profile-orders';
import { TOrder } from '../src/utils/types';

jest.mock('@components', () => ({
  OrdersList: ({ orders }: { orders: TOrder[] }) => (
    <div data-testid='orders-list'>
      {orders.map((order) => order.name).join(',')}
    </div>
  ),
  FeedInfo: () => <aside data-testid='feed-info' />,
  ProfileMenu: () => <nav data-testid='profile-menu' />
}));

const order: TOrder = {
  _id: 'order-1',
  status: 'done',
  name: 'Краторный бургер',
  createdAt: '2026-09-09T08:00:00.000Z',
  updatedAt: '2026-09-09T08:01:00.000Z',
  number: 42,
  ingredients: ['bun-1', 'main-1', 'bun-1']
};

describe('orders UI errors', () => {
  test('feed shows refresh error without hiding existing orders', () => {
    render(
      <FeedUI
        orders={[order]}
        error='Ошибка загрузки ленты'
        handleGetFeeds={jest.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ошибка загрузки ленты'
    );
    expect(screen.getByTestId('orders-list')).toHaveTextContent(
      'Краторный бургер'
    );
  });

  test('profile orders show history error without hiding existing orders', () => {
    render(<ProfileOrdersUI orders={[order]} error='Ошибка истории' />);

    expect(screen.getByRole('alert')).toHaveTextContent('Ошибка истории');
    expect(screen.getByTestId('orders-list')).toHaveTextContent(
      'Краторный бургер'
    );
  });
});
