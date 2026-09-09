import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  ThunkDispatch,
  UnknownAction
} from '@reduxjs/toolkit';

import {
  TypedUseSelectorHook,
  useDispatch as dispatchHook,
  useSelector as selectorHook
} from 'react-redux';

import ingredientsReducer from './slices/ingredientsSlice';
import constructorReducer from './slices/constructorSlice';
import feedReducer from './slices/feedSlice';
import userReducer from './slices/userSlice';
import ordersReducer from './slices/ordersSlice';
import orderDetailsReducer from './slices/orderDetailsSlice';
import { createOrder } from './slices/constructorSlice';
import { fetchFeeds } from './slices/feedSlice';
import { fetchUserOrders } from './slices/ordersSlice';

export const rootReducer = combineReducers({
  ingredients: ingredientsReducer,
  burgerConstructor: constructorReducer,
  feed: feedReducer,
  user: userReducer,
  orders: ordersReducer,
  orderDetails: orderDetailsReducer
});

export type RootState = ReturnType<typeof rootReducer>;

export const createAppStore = () => {
  const ordersListener = createListenerMiddleware<
    RootState,
    ThunkDispatch<RootState, unknown, UnknownAction>
  >();
  ordersListener.startListening({
    actionCreator: createOrder.fulfilled,
    effect: (_, api) => {
      api.dispatch(fetchFeeds());
      if (api.getState().user.user) api.dispatch(fetchUserOrders());
    }
  });
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(ordersListener.middleware),
    devTools: process.env.NODE_ENV !== 'production'
  });
};

const store = createAppStore();

export type AppDispatch = typeof store.dispatch;

export const useDispatch: () => AppDispatch = () => dispatchHook();
export const useSelector: TypedUseSelectorHook<RootState> = selectorHook;

export default store;
