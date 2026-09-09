import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getOrdersApi } from '@api';
import { TOrder, TOrdersData } from '@utils-types';
import { logoutUser } from './userSlice';

export type TOrdersState = {
  orders: TOrder[];
  total: number;
  totalToday: number;
  isLoading: boolean;
  error: string | null;
  currentRequestId: string | null;
};

const initialState: TOrdersState = {
  orders: [],
  total: 0,
  totalToday: 0,
  isLoading: false,
  error: null,
  currentRequestId: null
};

export const fetchUserOrders = createAsyncThunk(
  'orders/fetchUserOrders',
  async () => {
    const data = await getOrdersApi();
    return data;
  },
  {
    condition: (_, { getState }) =>
      !(getState() as { orders: TOrdersState }).orders.isLoading
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    ordersReceived: (state, action: PayloadAction<TOrdersData>) => {
      state.orders = action.payload.orders;
      state.total = action.payload.total;
      state.totalToday = action.payload.totalToday;
      state.error = null;
    },
    clearUserOrders: (state) => {
      state.orders = [];
      state.total = 0;
      state.totalToday = 0;
      state.isLoading = false;
      state.error = null;
      state.currentRequestId = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserOrders.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchUserOrders.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.isLoading = false;
        state.orders = action.payload;
        state.currentRequestId = null;
      })
      .addCase(fetchUserOrders.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.isLoading = false;
        state.error = action.error.message ?? 'Ошибка загрузки заказов';
        state.currentRequestId = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.orders = [];
        state.total = 0;
        state.totalToday = 0;
        state.isLoading = false;
        state.error = null;
        state.currentRequestId = null;
      });
  }
});

export const { ordersReceived, clearUserOrders } = ordersSlice.actions;

export default ordersSlice.reducer;

export const selectUserOrders = (state: { orders: TOrdersState }) =>
  state.orders.orders;

export const selectUserOrdersLoading = (state: { orders: TOrdersState }) =>
  state.orders.isLoading;

export const selectUserOrdersError = (state: { orders: TOrdersState }) =>
  state.orders.error;
