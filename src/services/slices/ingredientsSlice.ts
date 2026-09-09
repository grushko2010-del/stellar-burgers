import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getIngredientsApi } from '@api';
import { TIngredient } from '@utils-types';

type TIngredientsState = {
  ingredients: TIngredient[];
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
};

const initialState: TIngredientsState = {
  ingredients: [],
  isLoading: false,
  hasLoaded: false,
  error: null
};

export const fetchIngredients = createAsyncThunk(
  'ingredients/fetchAll',
  async () => {
    const data = await getIngredientsApi();
    return data;
  },
  {
    condition: (_, { getState }) =>
      !(getState() as { ingredients: TIngredientsState }).ingredients.isLoading
  }
);

const ingredientsSlice = createSlice({
  name: 'ingredients',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIngredients.pending, (state) => ({
        ...state,
        isLoading: true,
        error: null
      }))
      .addCase(fetchIngredients.fulfilled, (state, action) => ({
        ...state,
        isLoading: false,
        hasLoaded: true,
        ingredients: action.payload
      }))
      .addCase(fetchIngredients.rejected, (state, action) => ({
        ...state,
        isLoading: false,
        hasLoaded: true,
        error: action.error.message ?? 'Ошибка загрузки ингредиентов'
      }));
  }
});

export default ingredientsSlice.reducer;

export const selectIngredients = (state: { ingredients: TIngredientsState }) =>
  state.ingredients.ingredients;

export const selectIngredientsLoading = (state: {
  ingredients: TIngredientsState;
}) => state.ingredients.isLoading;

export const selectIngredientsError = (state: {
  ingredients: TIngredientsState;
}) => state.ingredients.error;

export const selectIngredientsLoaded = (state: {
  ingredients: TIngredientsState;
}) => state.ingredients.hasLoaded;
