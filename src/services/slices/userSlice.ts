import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getUserApi,
  loginUserApi,
  registerUserApi,
  logoutApi,
  updateUserApi,
  forgotPasswordApi,
  resetPasswordApi,
  TLoginData,
  TRegisterData
} from '@api';
import { TUser } from '@utils-types';
import { deleteCookie, getCookie, setCookie } from '../../utils/cookie';

type TUserState = {
  isAuthChecked: boolean;
  user: TUser | null;
  loginError: string | null;
  registerError: string | null;
  updateError: string | null;
  logoutError: string | null;
  checkAuthError: string | null;
  forgotPasswordError: string | null;
  resetPasswordError: string | null;
  isCheckAuthPending: boolean;
  isLoginPending: boolean;
  isRegisterPending: boolean;
  isUpdatePending: boolean;
  isLogoutPending: boolean;
  isForgotPasswordPending: boolean;
  isResetPasswordPending: boolean;
  authGeneration: number;
};

const initialState: TUserState = {
  isAuthChecked: false,
  user: null,
  loginError: null,
  registerError: null,
  updateError: null,
  logoutError: null,
  checkAuthError: null,
  forgotPasswordError: null,
  resetPasswordError: null,
  isCheckAuthPending: false,
  isLoginPending: false,
  isRegisterPending: false,
  isUpdatePending: false,
  isLogoutPending: false,
  isForgotPasswordPending: false,
  isResetPasswordPending: false,
  authGeneration: 0
};

export const checkUserAuth = createAsyncThunk(
  'user/checkAuth',
  async (_, { getState, rejectWithValue }) => {
    if (!getCookie('accessToken') && !localStorage.getItem('refreshToken')) {
      return rejectWithValue(null);
    }

    try {
      const generation = (getState() as { user: TUserState }).user
        .authGeneration;
      const data = await getUserApi();
      return { user: data.user, generation };
    } catch {
      return rejectWithValue(null);
    }
  },
  {
    condition: (_, { getState }) => {
      const state = (getState() as { user: TUserState }).user;
      return !state.isCheckAuthPending && !state.isAuthChecked;
    }
  }
);

export const loginUser = createAsyncThunk(
  'user/login',
  async (data: TLoginData, { rejectWithValue }) => {
    try {
      const response = await loginUserApi(data);
      setCookie('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      return response.user;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'user/register',
  async (data: TRegisterData, { rejectWithValue }) => {
    try {
      const response = await registerUserApi(data);
      setCookie('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      return response.user;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'user/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logoutApi();
      deleteCookie('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const updateUser = createAsyncThunk(
  'user/update',
  async (data: Partial<TRegisterData>, { getState, rejectWithValue }) => {
    try {
      const generation = (getState() as { user: TUserState }).user
        .authGeneration;
      const response = await updateUserApi(data);
      return { user: response.user, generation };
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'user/forgotPassword',
  async (data: { email: string }, { rejectWithValue }) => {
    try {
      await forgotPasswordApi(data);
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const resetPassword = createAsyncThunk(
  'user/resetPassword',
  async (data: { password: string; token: string }, { rejectWithValue }) => {
    try {
      await resetPasswordApi(data);
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.loginError = null;
      state.registerError = null;
      state.updateError = null;
      state.logoutError = null;
      state.checkAuthError = null;
      state.forgotPasswordError = null;
      state.resetPasswordError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkUserAuth.pending, (state) => {
        state.isCheckAuthPending = true;
        state.checkAuthError = null;
      })
      .addCase(checkUserAuth.fulfilled, (state, action) => {
        if (action.payload.generation === state.authGeneration) {
          state.user = action.payload.user;
        }
        state.isAuthChecked = true;
        state.isCheckAuthPending = false;
        state.checkAuthError = null;
      })
      .addCase(checkUserAuth.rejected, (state, action) => {
        state.isAuthChecked = true;
        state.isCheckAuthPending = false;
        state.checkAuthError = (action.payload as string) ?? null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthChecked = true;
        state.isLoginPending = false;
        state.loginError = null;
      })
      .addCase(loginUser.pending, (state) => {
        state.isLoginPending = true;
        state.loginError = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoginPending = false;
        state.isAuthChecked = true;
        state.loginError = action.payload as string;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthChecked = true;
        state.isRegisterPending = false;
        state.registerError = null;
      })
      .addCase(registerUser.pending, (state) => {
        state.isRegisterPending = true;
        state.registerError = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isRegisterPending = false;
        state.isAuthChecked = true;
        state.registerError = action.payload as string;
      })
      .addCase(logoutUser.pending, (state) => {
        state.authGeneration += 1;
        state.isLogoutPending = true;
        state.logoutError = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isLogoutPending = false;
        state.logoutError = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLogoutPending = false;
        state.logoutError = action.payload as string;
      })
      .addCase(updateUser.pending, (state) => {
        state.isUpdatePending = true;
        state.updateError = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        if (action.payload.generation === state.authGeneration) {
          state.user = action.payload.user;
        }
        state.isUpdatePending = false;
        state.updateError = null;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isUpdatePending = false;
        state.updateError = action.payload as string;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.isForgotPasswordPending = true;
        state.forgotPasswordError = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isForgotPasswordPending = false;
        state.forgotPasswordError = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isForgotPasswordPending = false;
        state.forgotPasswordError = action.payload as string;
      })
      .addCase(resetPassword.pending, (state) => {
        state.isResetPasswordPending = true;
        state.resetPasswordError = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isResetPasswordPending = false;
        state.resetPasswordError = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isResetPasswordPending = false;
        state.resetPasswordError = action.payload as string;
      });
  }
});

export const { clearErrors } = userSlice.actions;
export default userSlice.reducer;

export const selectUser = (state: { user: TUserState }) => state.user.user;
export const selectIsAuthChecked = (state: { user: TUserState }) =>
  state.user.isAuthChecked;
export const selectLoginError = (state: { user: TUserState }) =>
  state.user.loginError;
export const selectRegisterError = (state: { user: TUserState }) =>
  state.user.registerError;
export const selectUpdateError = (state: { user: TUserState }) =>
  state.user.updateError;
export const selectLogoutError = (state: { user: TUserState }) =>
  state.user.logoutError;
export const selectCheckAuthError = (state: { user: TUserState }) =>
  state.user.checkAuthError;
export const selectForgotPasswordError = (state: { user: TUserState }) =>
  state.user.forgotPasswordError;
export const selectResetPasswordError = (state: { user: TUserState }) =>
  state.user.resetPasswordError;
export const selectIsLoginPending = (state: { user: TUserState }) =>
  state.user.isLoginPending;
export const selectIsCheckAuthPending = (state: { user: TUserState }) =>
  state.user.isCheckAuthPending;
export const selectIsRegisterPending = (state: { user: TUserState }) =>
  state.user.isRegisterPending;
export const selectIsUpdatePending = (state: { user: TUserState }) =>
  state.user.isUpdatePending;
export const selectIsLogoutPending = (state: { user: TUserState }) =>
  state.user.isLogoutPending;
export const selectIsForgotPasswordPending = (state: { user: TUserState }) =>
  state.user.isForgotPasswordPending;
export const selectIsResetPasswordPending = (state: { user: TUserState }) =>
  state.user.isResetPasswordPending;
