import { configureStore } from '@reduxjs/toolkit';
import feedReducer, {
  fetchFeeds,
  feedOrdersReceived,
  selectFeedData,
  selectFeedError,
  selectFeedLoading,
  selectFeedOrders,
  selectFeedTotal,
  selectFeedTotalToday
} from '../src/services/slices/feedSlice';
import ordersReducer, {
  clearUserOrders,
  fetchUserOrders,
  ordersReceived,
  selectUserOrders,
  selectUserOrdersError,
  selectUserOrdersLoading
} from '../src/services/slices/ordersSlice';
import orderDetailsReducer, {
  clearOrderDetails,
  fetchOrderByNumber,
  selectOrderByNumber,
  selectOrderDetailsError,
  selectOrderDetailsLoading,
  selectOrderDetailsOrder,
  setOrderDetailsError
} from '../src/services/slices/orderDetailsSlice';
import { createOrdersPolling } from '../src/services/orderPolling';
import {
  calculateOrderTotal,
  collectOrderIngredients
} from '../src/services/orderUtils';
import { TIngredient, TOrder, TOrdersData } from '../src/utils/types';
import { logoutUser } from '../src/services/slices/userSlice';

const order: TOrder = {
  _id: 'order-1',
  status: 'done',
  name: 'Краторный бургер',
  createdAt: '2026-09-09T08:00:00.000Z',
  updatedAt: '2026-09-09T08:01:00.000Z',
  number: 42,
  ingredients: ['bun-1', 'main-1', 'bun-1']
};

const feedPayload: TOrdersData = {
  orders: [order],
  total: 100,
  totalToday: 7
};

const bun: TIngredient = {
  _id: 'bun-1',
  name: 'Космическая булка',
  type: 'bun',
  proteins: 1,
  fat: 1,
  carbohydrates: 1,
  calories: 1,
  price: 100,
  image: '',
  image_large: '',
  image_mobile: ''
};

const main: TIngredient = {
  _id: 'main-1',
  name: 'Метеоритная котлета',
  type: 'main',
  proteins: 1,
  fat: 1,
  carbohydrates: 1,
  calories: 1,
  price: 50,
  image: '',
  image_large: '',
  image_mobile: ''
};

const jsonResponse = (body: unknown, ok = true) =>
  Promise.resolve({
    ok,
    json: () => Promise.resolve(body)
  } as Response);

describe('orders services', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('fetchFeeds stores feed orders and totals from API', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      await jsonResponse({
        success: true,
        ...feedPayload
      })
    );

    const store = configureStore({ reducer: { feed: feedReducer } });

    await store.dispatch(fetchFeeds());

    expect(selectFeedData(store.getState())).toEqual(feedPayload);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://norma.education-services.ru/api/orders/all'
    );
  });

  test('received orders replace public feed and private history without token in Redux', () => {
    const store = configureStore({
      reducer: {
        feed: feedReducer,
        orders: ordersReducer
      }
    });

    store.dispatch(feedOrdersReceived(feedPayload));
    store.dispatch(ordersReceived(feedPayload));

    expect(selectFeedData(store.getState())).toEqual(feedPayload);
    expect(selectFeedOrders(store.getState())).toEqual([order]);
    expect(selectFeedTotal(store.getState())).toBe(100);
    expect(selectFeedTotalToday(store.getState())).toBe(7);
    expect(selectFeedLoading(store.getState())).toBe(false);
    expect(selectFeedError(store.getState())).toBeNull();
    expect(selectUserOrders(store.getState())).toEqual([order]);
    expect(selectUserOrdersLoading(store.getState())).toBe(false);
    expect(selectUserOrdersError(store.getState())).toBeNull();
    expect(JSON.stringify(store.getState())).not.toContain('secret-token');
  });

  test('fetchFeeds keeps previous data on refresh error and prevents overlap', async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    const deferred = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockReturnValueOnce(deferred)
      .mockRejectedValueOnce(new Error('network down'));

    const store = configureStore({ reducer: { feed: feedReducer } });

    const pendingAction = store.dispatch(fetchFeeds());
    await store.dispatch(fetchFeeds());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(selectFeedLoading(store.getState())).toBe(true);

    resolveFetch(
      await jsonResponse({
        success: true,
        ...feedPayload
      })
    );
    await pendingAction;
  });

  test('fetchFeeds stores refresh errors without clearing existing feed', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));
    const store = configureStore({ reducer: { feed: feedReducer } });

    store.dispatch(feedOrdersReceived(feedPayload));
    await store.dispatch(fetchFeeds());

    expect(selectFeedOrders(store.getState())).toEqual([order]);
    expect(selectFeedError(store.getState())).toBe('network down');
  });

  test('feed reducer uses fallback error when rejection has no message', () => {
    const store = configureStore({ reducer: { feed: feedReducer } });

    store.dispatch({ type: fetchFeeds.rejected.type, error: {} });

    expect(selectFeedError(store.getState())).toBe(
      'Ошибка загрузки ленты заказов'
    );
  });

  test('createOrdersPolling runs once immediately and cleans interval', () => {
    jest.useFakeTimers();
    const fetchOrders = jest.fn();

    const polling = createOrdersPolling(fetchOrders);

    polling.start();
    polling.start();
    jest.advanceTimersByTime(5000);
    polling.stop();
    jest.advanceTimersByTime(5000);

    expect(fetchOrders).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  test('order total charges two buns whether API returns one or two bun ids', () => {
    const orderWithOneBun = {
      ...order,
      ingredients: ['bun-1', 'main-1']
    };
    const orderWithTwoBuns = {
      ...order,
      ingredients: ['bun-1', 'main-1', 'bun-1']
    };

    expect(calculateOrderTotal(orderWithOneBun, [bun, main])).toBe(250);
    expect(calculateOrderTotal(orderWithTwoBuns, [bun, main])).toBe(250);
    expect(calculateOrderTotal(orderWithTwoBuns, [bun])).toBe(200);
    expect(collectOrderIngredients(['bun-1', 'unknown'], [bun, main])).toEqual([
      bun
    ]);
  });

  test('fetchUserOrders stores history, handles errors, and clears on logout', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        await jsonResponse({ success: true, orders: [order] })
      )
      .mockRejectedValueOnce(new Error('history failed'));
    const store = configureStore({ reducer: { orders: ordersReducer } });

    await store.dispatch(fetchUserOrders());

    expect(selectUserOrders(store.getState())).toEqual([order]);
    expect(selectUserOrdersLoading(store.getState())).toBe(false);

    await store.dispatch(fetchUserOrders());

    expect(selectUserOrdersError(store.getState())).toBe('history failed');

    store.dispatch(clearUserOrders());
    expect(selectUserOrders(store.getState())).toEqual([]);

    store.dispatch(ordersReceived(feedPayload));
    store.dispatch({ type: logoutUser.fulfilled.type });

    expect(selectUserOrders(store.getState())).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('user orders ignore late stale responses', () => {
    const store = configureStore({ reducer: { orders: ordersReducer } });

    store.dispatch(fetchUserOrders.pending('current-request'));
    store.dispatch(fetchUserOrders.fulfilled([order], 'stale-request'));

    expect(selectUserOrders(store.getState())).toEqual([]);
    expect(selectUserOrdersLoading(store.getState())).toBe(true);

    store.dispatch(fetchUserOrders.rejected(null, 'stale-request'));

    expect(selectUserOrdersLoading(store.getState())).toBe(true);

    store.dispatch(fetchUserOrders.fulfilled([order], 'current-request'));

    expect(selectUserOrders(store.getState())).toEqual([order]);
  });

  test('logout during pending history request clears loading and allows next fetch', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        await jsonResponse({ success: true, orders: [order] })
      );
    const store = configureStore({ reducer: { orders: ordersReducer } });

    store.dispatch(fetchUserOrders.pending('old-request'));
    store.dispatch({ type: logoutUser.fulfilled.type });
    store.dispatch(fetchUserOrders.fulfilled([order], 'old-request'));

    expect(selectUserOrders(store.getState())).toEqual([]);
    expect(selectUserOrdersLoading(store.getState())).toBe(false);

    await store.dispatch(fetchUserOrders());

    expect(selectUserOrders(store.getState())).toEqual([order]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('fetchOrderByNumber stores found order and treats empty result as not found', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        await jsonResponse({ success: true, orders: [order] })
      )
      .mockResolvedValueOnce(await jsonResponse({ success: true, orders: [] }));

    const store = configureStore({
      reducer: { orderDetails: orderDetailsReducer }
    });

    await store.dispatch(fetchOrderByNumber(42));

    expect(selectOrderDetailsOrder(store.getState())).toEqual(order);

    await store.dispatch(fetchOrderByNumber(404));

    expect(selectOrderDetailsOrder(store.getState())).toBeNull();
    expect(selectOrderDetailsError(store.getState())).toBe('Заказ не найден');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://norma.education-services.ru/api/orders/404',
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
  });

  test('order details handles invalid numbers, stale responses, and selectors', async () => {
    const store = configureStore({
      reducer: {
        feed: feedReducer,
        orders: ordersReducer,
        orderDetails: orderDetailsReducer
      }
    });

    await store.dispatch(fetchOrderByNumber(0));

    expect(selectOrderDetailsError(store.getState())).toBe(
      'Некорректный номер заказа'
    );

    store.dispatch(setOrderDetailsError('Своя ошибка'));
    expect(selectOrderDetailsError(store.getState())).toBe('Своя ошибка');

    store.dispatch(clearOrderDetails());
    expect(selectOrderDetailsOrder(store.getState())).toBeNull();
    expect(selectOrderDetailsLoading(store.getState())).toBe(false);

    store.dispatch(fetchOrderByNumber.pending('old-request', 100));
    store.dispatch(fetchOrderByNumber.fulfilled(order, 'new-request', 42));

    expect(selectOrderDetailsOrder(store.getState())).toBeNull();

    store.dispatch(feedOrdersReceived(feedPayload));

    expect(selectOrderByNumber(store.getState(), 42)).toEqual(order);

    store.dispatch(clearOrderDetails());
    store.dispatch(fetchOrderByNumber.fulfilled(order, 'current-request', 42));

    expect(selectOrderByNumber(store.getState(), 42)).toEqual(order);
    expect(selectOrderByNumber(store.getState(), 999)).toBeNull();
  });

  test('order details ignore stale rejections while current request is active', () => {
    const store = configureStore({
      reducer: { orderDetails: orderDetailsReducer }
    });

    store.dispatch(fetchOrderByNumber.pending('current-request', 42));
    store.dispatch(fetchOrderByNumber.rejected(null, 'stale-request', 404));

    expect(selectOrderDetailsLoading(store.getState())).toBe(true);
    expect(selectOrderDetailsError(store.getState())).toBeNull();
  });
});
