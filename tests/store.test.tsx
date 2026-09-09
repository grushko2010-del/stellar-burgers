import { render, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createAppStore } from '../src/services/store';
import { createOrder } from '../src/services/slices/constructorSlice';
import { loginUser } from '../src/services/slices/userSlice';
import {
  useFeedOrdersPolling,
  useProfileOrdersPolling
} from '../src/services/useOrderStream';

const order = {
  _id: 'order',
  number: 42,
  name: 'Бургер',
  ingredients: ['bun', 'bun'],
  status: 'done',
  createdAt: '2026-09-09T10:00:00Z',
  updatedAt: '2026-09-09T10:00:00Z'
};
function mockServer() {
  global.fetch = jest
    .fn()
    .mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        url.endsWith('/auth/login')
          ? {
              success: true,
              user: { name: 'User', email: 'user@example.test' },
              accessToken: 'Bearer test',
              refreshToken: 'test'
            }
          : {
              success: true,
              order,
              name: order.name,
              orders: [order],
              total: 12,
              totalToday: 2
            }
    }));
}

test('successful checkout refreshes the feed and personal history immediately', async () => {
  mockServer();
  const store = createAppStore();
  await store.dispatch(
    loginUser({ email: 'user@example.test', password: 'test-password' })
  );
  await store.dispatch(createOrder(['bun', 'bun']));
  await waitFor(() =>
    expect(store.getState().orders.orders[0]?.number).toBe(42)
  );
  expect(store.getState().feed.total).toBe(12);
  expect(store.getState().feed.totalToday).toBe(2);
});

function FeedPollingProbe() {
  useFeedOrdersPolling();
  return null;
}
function ProfilePollingProbe() {
  useProfileOrdersPolling();
  return null;
}

test.each([
  ['public', FeedPollingProbe],
  ['private', ProfilePollingProbe]
] as const)(
  '%s orders poll only while their view is mounted',
  async (_, PollingProbe) => {
    jest.useFakeTimers();
    try {
      mockServer();
      const store = createAppStore();
      const view = render(
        <Provider store={store}>
          <PollingProbe />
        </Provider>
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(global.fetch).toHaveBeenCalledTimes(2);
      view.unmount();
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  }
);
