import {
  createSlice,
  createAsyncThunk,
  createSelector,
  PayloadAction
} from '@reduxjs/toolkit';
import { getFeedsApi } from '@api';
import { TOrder, TOrdersData } from '@utils-types';

export type TFeedState = {
  orders: TOrder[];
  total: number;
  totalToday: number;
  isLoading: boolean;
  error: string | null;
};

const initialState: TFeedState = {
  orders: [],
  total: 0,
  totalToday: 0,
  isLoading: false,
  error: null
};

export const fetchFeeds = createAsyncThunk(
  'feed/fetchAll',
  async () => {
    const data = await getFeedsApi();
    return data as TOrdersData;
  },
  {
    condition: (_, { getState }) =>
      !(getState() as { feed: TFeedState }).feed.isLoading
  }
);

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    feedOrdersReceived: (state, action: PayloadAction<TOrdersData>) => {
      state.orders = action.payload.orders;
      state.total = action.payload.total;
      state.totalToday = action.payload.totalToday;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeeds.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFeeds.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload.orders;
        state.total = action.payload.total;
        state.totalToday = action.payload.totalToday;
      })
      .addCase(fetchFeeds.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Ошибка загрузки ленты заказов';
      });
  }
});

export const { feedOrdersReceived } = feedSlice.actions;

export default feedSlice.reducer;

export const selectFeedOrders = (state: { feed: TFeedState }) =>
  state.feed.orders;

export const selectFeedTotal = (state: { feed: TFeedState }) =>
  state.feed.total;

export const selectFeedTotalToday = (state: { feed: TFeedState }) =>
  state.feed.totalToday;

export const selectFeedLoading = (state: { feed: TFeedState }) =>
  state.feed.isLoading;

export const selectFeedData = createSelector(
  [selectFeedOrders, selectFeedTotal, selectFeedTotalToday],
  (orders, total, totalToday) => ({ orders, total, totalToday })
);

export const selectFeedError = (state: { feed: TFeedState }) =>
  state.feed.error;
