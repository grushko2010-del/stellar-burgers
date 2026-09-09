import { configureStore } from '@reduxjs/toolkit';
import reducer, {
  fetchIngredients
} from '../src/services/slices/ingredientsSlice';

test('ingredient loading is shared across mounts and keeps server data in Redux', async () => {
  let finish!: (response: Response) => void;
  global.fetch = jest.fn(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      })
  );
  const store = configureStore({ reducer: { ingredients: reducer } });
  const request = store.dispatch(fetchIngredients());
  await store.dispatch(fetchIngredients());
  expect(global.fetch).toHaveBeenCalledTimes(1);
  finish({
    ok: true,
    json: async () => ({ success: true, data: [] })
  } as Response);
  await request;
  expect(store.getState().ingredients.isLoading).toBe(false);
  expect(store.getState().ingredients.ingredients).toEqual([]);
});

test('failed ingredient load ends the loader and a retry can recover', async () => {
  global.fetch = jest
    .fn()
    .mockRejectedValueOnce(new Error('Нет соединения'))
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });
  const store = configureStore({ reducer: { ingredients: reducer } });
  await store.dispatch(fetchIngredients());
  expect(store.getState().ingredients.error).toBe('Нет соединения');
  expect(store.getState().ingredients.isLoading).toBe(false);
  await store.dispatch(fetchIngredients());
  expect(store.getState().ingredients.error).toBeNull();
});
