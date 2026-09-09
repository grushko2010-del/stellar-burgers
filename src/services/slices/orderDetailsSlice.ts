import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getOrderByNumberApi } from '@api';
import { TOrder } from '@utils-types';
import { TFeedState } from './feedSlice';
import { TOrdersState } from './ordersSlice';

export type TOrderDetailsState = {
  order: TOrder | null;
  isLoading: boolean;
  error: string | null;
  currentRequestId: string | null;
  requestedNumber: number | null;
};

type TOrderLookupState = {
  feed?: TFeedState;
  orders?: TOrdersState;
  orderDetails: TOrderDetailsState;
};

const initialState: TOrderDetailsState = {
  order: null,
  isLoading: false,
  error: null,
  currentRequestId: null,
  requestedNumber: null
};

export const fetchOrderByNumber = createAsyncThunk(
  'orderDetails/fetchByNumber',
  async (number: number, { rejectWithValue }) => {
    if (!Number.isInteger(number) || number <= 0) {
      return rejectWithValue('Некорректный номер заказа');
    }

    const data = await getOrderByNumberApi(number);
    const order = data.orders[0];

    if (!order) {
      return rejectWithValue('Заказ не найден');
    }

    return order;
  }
);

const orderDetailsSlice = createSlice({
  name: 'orderDetails',
  initialState,
  reducers: {
    clearOrderDetails: (state) => {
      state.order = null;
      state.isLoading = false;
      state.error = null;
      state.currentRequestId = null;
      state.requestedNumber = null;
    },
    setOrderDetailsError: (state, action: PayloadAction<string>) => {
      state.order = null;
      state.isLoading = false;
      state.error = action.payload;
      state.currentRequestId = null;
      state.requestedNumber = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrderByNumber.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
        state.currentRequestId = action.meta.requestId;
        state.requestedNumber = action.meta.arg;
      })
      .addCase(fetchOrderByNumber.fulfilled, (state, action) => {
        if (
          state.currentRequestId !== action.meta.requestId ||
          state.requestedNumber !== action.meta.arg
        ) {
          return;
        }

        state.isLoading = false;
        state.order = action.payload;
        state.currentRequestId = null;
      })
      .addCase(fetchOrderByNumber.rejected, (state, action) => {
        if (
          state.currentRequestId &&
          (state.currentRequestId !== action.meta.requestId ||
            state.requestedNumber !== action.meta.arg)
        ) {
          return;
        }

        state.isLoading = false;
        state.order = null;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          'Ошибка загрузки заказа';
        state.currentRequestId = null;
      });
  }
});

export const { clearOrderDetails, setOrderDetailsError } =
  orderDetailsSlice.actions;

export default orderDetailsSlice.reducer;

export const selectOrderDetailsOrder = (state: {
  orderDetails: TOrderDetailsState;
}) => state.orderDetails.order;

export const selectOrderDetailsLoading = (state: {
  orderDetails: TOrderDetailsState;
}) => state.orderDetails.isLoading;

export const selectOrderDetailsError = (state: {
  orderDetails: TOrderDetailsState;
}) => state.orderDetails.error;

export const selectOrderByNumber = (state: TOrderLookupState, number: number) =>
  state.feed?.orders.find((item) => item.number === number) ??
  state.orders?.orders.find((item) => item.number === number) ??
  (state.orderDetails.order?.number === number
    ? state.orderDetails.order
    : null);
