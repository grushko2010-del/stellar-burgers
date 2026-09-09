import {
  createSlice,
  createAsyncThunk,
  createSelector,
  PayloadAction
} from '@reduxjs/toolkit';
import { orderBurgerApi } from '@api';
import { TConstructorIngredient, TIngredient, TOrder } from '@utils-types';
import { v4 as uuidv4 } from 'uuid';

type TConstructorState = {
  bun: TConstructorIngredient | null;
  ingredients: TConstructorIngredient[];
  orderRequest: boolean;
  isOrderModalOpen: boolean;
  orderModalData: TOrder | null;
  error: string | null;
};

const initialState: TConstructorState = {
  bun: null,
  ingredients: [],
  orderRequest: false,
  isOrderModalOpen: false,
  orderModalData: null,
  error: null
};

export const createOrder = createAsyncThunk(
  'constructor/createOrder',
  async (ingredientIds: string[]) => {
    const data = await orderBurgerApi(ingredientIds);
    return { ...data, order: { ...data.order, ingredients: ingredientIds } };
  },
  {
    condition: (_, { getState }) =>
      !(getState() as { burgerConstructor: TConstructorState })
        .burgerConstructor.orderRequest
  }
);

const constructorSlice = createSlice({
  name: 'burgerConstructor',
  initialState,
  reducers: {
    addIngredient: {
      reducer: (state, action: PayloadAction<TConstructorIngredient>) =>
        action.payload.type === 'bun'
          ? { ...state, bun: action.payload }
          : { ...state, ingredients: [...state.ingredients, action.payload] },
      prepare: (ingredient: TIngredient) => ({
        payload: { ...ingredient, id: uuidv4() }
      })
    },
    removeIngredient: (state, action: PayloadAction<string>) => ({
      ...state,
      ingredients: state.ingredients.filter(
        (item) => item.id !== action.payload
      )
    }),
    moveIngredientUp: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (
        !Number.isInteger(index) ||
        index <= 0 ||
        index >= state.ingredients.length
      )
        return state;
      return {
        ...state,
        ingredients: state.ingredients.map((item, position) =>
          position === index - 1
            ? state.ingredients[index]
            : position === index
              ? state.ingredients[index - 1]
              : item
        )
      };
    },
    moveIngredientDown: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= state.ingredients.length - 1
      )
        return state;
      return {
        ...state,
        ingredients: state.ingredients.map((item, position) =>
          position === index + 1
            ? state.ingredients[index]
            : position === index
              ? state.ingredients[index + 1]
              : item
        )
      };
    },
    clearConstructor: (state) => ({
      ...state,
      bun: null,
      ingredients: [],
      orderModalData: null
    }),
    closeOrderModal: (state) => ({
      ...state,
      orderModalData: null,
      isOrderModalOpen: false
    })
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => ({
        ...state,
        orderRequest: true,
        isOrderModalOpen: true,
        error: null
      }))
      .addCase(createOrder.fulfilled, (state, action) => ({
        ...state,
        orderRequest: false,
        isOrderModalOpen: true,
        orderModalData: action.payload.order,
        bun: null,
        ingredients: []
      }))
      .addCase(createOrder.rejected, (state, action) => ({
        ...state,
        orderRequest: false,
        isOrderModalOpen: false,
        error: action.error.message ?? 'Ошибка оформления заказа'
      }));
  }
});

export const {
  addIngredient,
  removeIngredient,
  moveIngredientUp,
  moveIngredientDown,
  clearConstructor,
  closeOrderModal
} = constructorSlice.actions;

export default constructorSlice.reducer;

type TConstructorRoot = { burgerConstructor: TConstructorState };
export const selectConstructorItems = createSelector(
  [
    (state: TConstructorRoot) => state.burgerConstructor.bun,
    (state: TConstructorRoot) => state.burgerConstructor.ingredients
  ],
  (bun, ingredients) => ({ bun, ingredients })
);
export const selectConstructorPrice = createSelector(
  [selectConstructorItems],
  ({ bun, ingredients }) =>
    (bun ? bun.price * 2 : 0) +
    ingredients.reduce((total, item) => total + item.price, 0)
);
export const selectConstructorError = (state: TConstructorRoot) =>
  state.burgerConstructor.error;
export const selectOrderModalOpen = (state: TConstructorRoot) =>
  state.burgerConstructor.isOrderModalOpen;

export const selectOrderRequest = (state: {
  burgerConstructor: TConstructorState;
}) => state.burgerConstructor.orderRequest;

export const selectOrderModalData = (state: {
  burgerConstructor: TConstructorState;
}) => state.burgerConstructor.orderModalData;
