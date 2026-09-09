import React from 'react';
import '@testing-library/jest-dom';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import userReducer, {
  checkUserAuth,
  forgotPassword,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  updateUser,
  selectCheckAuthError,
  selectForgotPasswordError,
  selectIsAuthChecked,
  selectIsForgotPasswordPending,
  selectIsLoginPending,
  selectIsLogoutPending,
  selectIsRegisterPending,
  selectIsResetPasswordPending,
  selectIsUpdatePending,
  selectLoginError,
  selectLogoutError,
  selectRegisterError,
  selectUpdateError,
  selectUser
} from '../src/services/slices/userSlice';
import { Login } from '../src/pages/login';
import { ForgotPassword } from '../src/pages/forgot-password';
import { ResetPassword } from '../src/pages/reset-password';
import { Profile } from '../src/pages/profile';
import { ProtectedRoute } from '../src/components/protected-route';
import { AppHeaderUI } from '../src/components/ui/app-header';

const okResponse = (body: unknown) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body)
  } as Response);

const failResponse = (body: unknown) =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve(body)
  } as Response);

const deferredResponse = (body: unknown) => {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return {
    promise,
    resolve: () =>
      resolve({
        ok: true,
        json: () => Promise.resolve(body)
      } as Response)
  };
};

const createTestStore = (
  preloadedUser?: Partial<ReturnType<typeof userReducer>>
) =>
  configureStore({
    reducer: { user: userReducer },
    preloadedState: preloadedUser
      ? {
          user: {
            ...userReducer(undefined, { type: 'init' }),
            ...preloadedUser
          }
        }
      : undefined
  });

const renderWithStore = (
  ui: React.ReactElement,
  options: {
    route?: string;
    store?: ReturnType<typeof createTestStore>;
  } = {}
) => {
  const store = options.store ?? createTestStore();
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[options.route ?? '/']}>{ui}</MemoryRouter>
    </Provider>
  );
  return store;
};

const getInput = (name: string) => {
  const input = document.querySelector<HTMLInputElement>(
    `input[name="${name}"]`
  );
  if (!input) {
    throw new Error(`Input "${name}" was not found`);
  }
  return input;
};

describe('auth slice', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('tracks login pending, stores user and marks auth checked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      okResponse({
        success: true,
        accessToken: 'Bearer access',
        refreshToken: 'refresh',
        user: { name: 'Ada', email: 'ada@example.com' }
      })
    );
    const store = createTestStore();

    const action = store.dispatch(
      loginUser({ email: 'ada@example.com', password: 'secret' })
    );

    expect(selectIsLoginPending(store.getState())).toBe(true);
    await action;

    expect(selectIsLoginPending(store.getState())).toBe(false);
    expect(selectIsAuthChecked(store.getState())).toBe(true);
    expect(selectUser(store.getState())).toEqual({
      name: 'Ada',
      email: 'ada@example.com'
    });
  });

  it('tracks login failure without storing a user', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      failResponse({ message: 'Invalid credentials' })
    );
    const store = createTestStore();

    await store.dispatch(
      loginUser({ email: 'ada@example.com', password: 'bad-secret' })
    );

    expect(selectIsLoginPending(store.getState())).toBe(false);
    expect(selectLoginError(store.getState())).toBe('Invalid credentials');
    expect(selectUser(store.getState())).toBeNull();
  });

  it('tracks register success and failure through real api calls', async () => {
    const store = createTestStore();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        okResponse({
          success: true,
          accessToken: 'Bearer access',
          refreshToken: 'refresh',
          user: { name: 'Grace', email: 'grace@example.com' }
        })
      )
      .mockResolvedValueOnce(failResponse({ message: 'Email exists' }));

    const registerAction = store.dispatch(
      registerUser({
        name: 'Grace',
        email: 'grace@example.com',
        password: 'secret'
      })
    );
    expect(selectIsRegisterPending(store.getState())).toBe(true);
    await registerAction;
    expect(selectUser(store.getState())).toEqual({
      name: 'Grace',
      email: 'grace@example.com'
    });

    await store.dispatch(
      registerUser({
        name: 'Grace',
        email: 'grace@example.com',
        password: 'secret'
      })
    );
    expect(selectIsRegisterPending(store.getState())).toBe(false);
    expect(selectRegisterError(store.getState())).toBe('Email exists');
  });

  it('bootstraps auth once and skips network when no tokens exist', async () => {
    const store = createTestStore();

    await store.dispatch(checkUserAuth());

    expect(global.fetch).not.toHaveBeenCalled();
    expect(selectIsAuthChecked(store.getState())).toBe(true);
    expect(selectCheckAuthError(store.getState())).toBeNull();
  });

  it('dedupes concurrent auth bootstrap requests', async () => {
    document.cookie = 'accessToken=Bearer%20access; path=/';
    const response = deferredResponse({
      success: true,
      user: { name: 'Ada', email: 'ada@example.com' }
    });
    (global.fetch as jest.Mock).mockReturnValue(response.promise);
    const store = createTestStore();

    const first = store.dispatch(checkUserAuth());
    const second = store.dispatch(checkUserAuth());
    response.resolve();
    await Promise.all([first, second]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(selectUser(store.getState())).toEqual({
      name: 'Ada',
      email: 'ada@example.com'
    });
  });

  it('tracks update failure and logout success/failure', async () => {
    document.cookie = 'accessToken=Bearer%20access; path=/';
    localStorage.setItem('refreshToken', 'refresh');
    const store = createTestStore({
      isAuthChecked: true,
      user: { name: 'Ada', email: 'ada@example.com' }
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(failResponse({ message: 'Update failed' }))
      .mockResolvedValueOnce(okResponse({ success: true }))
      .mockResolvedValueOnce(failResponse({ message: 'Logout failed' }));

    const updateAction = store.dispatch(updateUser({ name: 'Grace' }));
    expect(selectIsUpdatePending(store.getState())).toBe(true);
    await updateAction;
    expect(selectIsUpdatePending(store.getState())).toBe(false);
    expect(selectUpdateError(store.getState())).toBe('Update failed');
    expect(selectUser(store.getState())).toEqual({
      name: 'Ada',
      email: 'ada@example.com'
    });

    const logoutAction = store.dispatch(logoutUser());
    expect(selectIsLogoutPending(store.getState())).toBe(true);
    await logoutAction;
    expect(selectIsLogoutPending(store.getState())).toBe(false);
    expect(selectUser(store.getState())).toBeNull();

    await store.dispatch(logoutUser());
    expect(selectLogoutError(store.getState())).toBe('Logout failed');
  });

  it('does not resurrect user from late update after logout', async () => {
    document.cookie = 'accessToken=Bearer%20access; path=/';
    localStorage.setItem('refreshToken', 'refresh');
    const updateResponse = deferredResponse({
      success: true,
      user: { name: 'Late', email: 'late@example.com' }
    });
    (global.fetch as jest.Mock)
      .mockReturnValueOnce(updateResponse.promise)
      .mockResolvedValueOnce(okResponse({ success: true }));
    const store = createTestStore({
      isAuthChecked: true,
      user: { name: 'Ada', email: 'ada@example.com' }
    });

    const updateAction = store.dispatch(updateUser({ name: 'Late' }));
    await store.dispatch(logoutUser());
    updateResponse.resolve();
    await updateAction;

    expect(selectUser(store.getState())).toBeNull();
  });

  it('keeps pending and errors for forgot/reset password thunks', async () => {
    const store = createTestStore();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(failResponse({ message: 'Email not found' }))
      .mockResolvedValueOnce(okResponse({ success: true }));

    const forgotAction = store.dispatch(
      forgotPassword({ email: 'missing@example.com' })
    );
    expect(selectIsForgotPasswordPending(store.getState())).toBe(true);
    await forgotAction;
    expect(selectIsForgotPasswordPending(store.getState())).toBe(false);
    expect(selectForgotPasswordError(store.getState())).toBe('Email not found');

    const resetAction = store.dispatch(
      resetPassword({ password: 'new-password', token: 'code' })
    );
    expect(selectIsResetPasswordPending(store.getState())).toBe(true);
    await resetAction;
    expect(selectIsResetPasswordPending(store.getState())).toBe(false);
  });

  it('tracks reset password failure', async () => {
    const store = createTestStore();
    (global.fetch as jest.Mock).mockResolvedValue(
      failResponse({ message: 'Bad reset token' })
    );

    await store.dispatch(
      resetPassword({ password: 'new-password', token: 'bad-code' })
    );

    expect(selectIsResetPasswordPending(store.getState())).toBe(false);
    expect(store.getState().user.resetPasswordError).toBe('Bad reset token');
  });
});

describe('auth pages', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('returns a guest to the protected page requested before login', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      okResponse({
        success: true,
        accessToken: 'Bearer access',
        refreshToken: 'refresh',
        user: { name: 'Ada', email: 'ada@example.com' }
      })
    );

    renderWithStore(
      <Routes>
        <Route
          path='/login'
          element={
            <ProtectedRoute onlyUnAuth>
              <Login />
            </ProtectedRoute>
          }
        />
        <Route path='/profile' element={<div>Private profile</div>} />
      </Routes>,
      {
        route: {
          pathname: '/login',
          state: { from: { pathname: '/profile' } }
        } as never,
        store: createTestStore({ isAuthChecked: true })
      }
    );

    await userEvent.type(getInput('email'), 'ada@example.com');
    await userEvent.type(getInput('password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText('Private profile')).toBeInTheDocument();
  });

  it('moves forgot/reset password requests through thunks and guards reset page', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okResponse({ success: true }))
      .mockResolvedValueOnce(okResponse({ success: true }));

    renderWithStore(
      <Routes>
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='/login' element={<div>Login page</div>} />
      </Routes>,
      { route: '/forgot-password' }
    );

    await userEvent.type(getInput('email'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Восстановить' }));
    await waitFor(() => expect(getInput('token')).toBeInTheDocument());

    await userEvent.type(getInput('password'), 'new-password');
    await userEvent.type(getInput('token'), 'code');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(localStorage.getItem('resetPassword')).toBeNull();
  });

  it('lets profile changes be cancelled and saved', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      okResponse({
        success: true,
        user: { name: 'Grace', email: 'grace@example.com' }
      })
    );

    const store = createTestStore({
      isAuthChecked: true,
      user: { name: 'Ada', email: 'ada@example.com' }
    });

    renderWithStore(<Profile />, { route: '/profile', store });

    const nameInput = screen.getByDisplayValue('Ada');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Temp');
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument();

    await userEvent.clear(screen.getByDisplayValue('Ada'));
    await userEvent.type(getInput('name'), 'Grace');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(selectUser(store.getState())).toEqual({
        name: 'Grace',
        email: 'grace@example.com'
      })
    );
  });
});

describe('app header auth navigation', () => {
  it('keeps constructor active for ingredient details but not feed pages', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/ingredients/bun']}>
        <AppHeaderUI userName='Ada' />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Конструктор' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(
      screen.getByRole('link', { name: 'Лента заказов' })
    ).not.toHaveAttribute('aria-current');

    unmount();

    render(
      <MemoryRouter initialEntries={['/feed/42']}>
        <AppHeaderUI userName='Ada' />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Лента заказов' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(
      screen.getByRole('link', { name: 'Конструктор' })
    ).not.toHaveAttribute('aria-current');
  });
});
