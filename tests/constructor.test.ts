import { configureStore } from '@reduxjs/toolkit';
import reducer, {
  addIngredient,
  removeIngredient,
  moveIngredientDown,
  moveIngredientUp,
  closeOrderModal,
  createOrder,
  selectConstructorItems,
  selectConstructorPrice,
  selectConstructorError,
  selectOrderRequest,
  selectOrderModalData,
  selectOrderModalOpen,
  clearConstructor
} from '../src/services/slices/constructorSlice';
import { TIngredient } from '../src/utils/types';

const bun: TIngredient = {
  _id: 'bun',
  name: 'Булка',
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
const filling = {
  ...bun,
  _id: 'filling',
  name: 'Начинка',
  type: 'main',
  price: 50
};
const makeStore = () =>
  configureStore({ reducer: { burgerConstructor: reducer } });

test('replacing a bun keeps one bun type and repeated fillings can be removed independently', () => {
  const store = makeStore();
  store.dispatch(addIngredient(bun));
  store.dispatch(addIngredient({ ...bun, _id: 'other-bun' }));
  store.dispatch(addIngredient(filling));
  store.dispatch(addIngredient(filling));
  const items = selectConstructorItems(store.getState());
  expect(items.bun?._id).toBe('other-bun');
  expect(items.ingredients[0].id).not.toBe(items.ingredients[1].id);
  store.dispatch(removeIngredient(items.ingredients[0].id));
  expect(selectConstructorItems(store.getState()).ingredients).toEqual([
    items.ingredients[1]
  ]);
});

test('out of range movement never corrupts the burger', () => {
  const store = makeStore();
  store.dispatch(addIngredient(filling));
  const before = store.getState();
  store.dispatch(moveIngredientDown(-1));
  store.dispatch(moveIngredientUp(2));
  expect(store.getState()).toEqual(before);
});

test('closing the pending dialog cannot enable a duplicate order', async () => {
  let resolveRequest!: (response: Response) => void;
  global.fetch = jest.fn(
    () =>
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      })
  );
  const store = makeStore();
  store.dispatch(addIngredient(bun));
  store.dispatch(addIngredient(filling));
  const request = store.dispatch(createOrder(['bun', 'filling', 'bun']));
  store.dispatch(closeOrderModal());
  expect(store.getState().burgerConstructor.orderRequest).toBe(true);
  resolveRequest({
    ok: true,
    json: async () => ({
      success: true,
      name: 'Бургер',
      order: {
        _id: 'order',
        number: 42,
        name: 'Бургер',
        status: 'done',
        createdAt: '2026-09-09T00:00:00Z',
        updatedAt: '2026-09-09T00:00:00Z'
      }
    })
  } as Response);
  await request;
  expect(store.getState().burgerConstructor.bun).toBeNull();
  expect(store.getState().burgerConstructor.ingredients).toEqual([]);
  expect(store.getState().burgerConstructor.orderModalData).toMatchObject({
    number: 42,
    ingredients: ['bun', 'filling', 'bun']
  });
});

test('failed checkout preserves the burger for a retry and exposes the error', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Сервер недоступен'));
  const store = makeStore();
  store.dispatch(addIngredient(bun));
  await store.dispatch(createOrder(['bun', 'bun']));
  expect(store.getState().burgerConstructor.bun?._id).toBe('bun');
  expect(store.getState().burgerConstructor.orderRequest).toBe(false);
  expect(store.getState().burgerConstructor.error).toBeTruthy();
});

test('price counts the bun twice and reordering changes only filling positions', () => {
  const store = makeStore();
  expect(selectConstructorPrice(store.getState())).toBe(0);
  store.dispatch(addIngredient(bun));
  store.dispatch(addIngredient(filling));
  store.dispatch(
    addIngredient({ ...filling, _id: 'sauce', type: 'sauce', price: 25 })
  );
  expect(selectConstructorPrice(store.getState())).toBe(275);
  store.dispatch(moveIngredientDown(0));
  expect(
    selectConstructorItems(store.getState()).ingredients.map((item) => item._id)
  ).toEqual(['sauce', 'filling']);
  store.dispatch(moveIngredientUp(1));
  expect(
    selectConstructorItems(store.getState()).ingredients.map((item) => item._id)
  ).toEqual(['filling', 'sauce']);
  expect(selectConstructorPrice(store.getState())).toBe(275);
  expect(selectConstructorItems(store.getState())).toBe(
    selectConstructorItems(store.getState())
  );
  store.dispatch(clearConstructor());
  expect(selectConstructorPrice(store.getState())).toBe(0);
  expect(selectConstructorError(store.getState())).toBeNull();
  expect(selectOrderRequest(store.getState())).toBe(false);
  expect(selectOrderModalData(store.getState())).toBeNull();
  expect(selectOrderModalOpen(store.getState())).toBe(false);
});
