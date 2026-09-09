import {
  fetchWithRefresh,
  forgotPasswordApi,
  getFeedsApi,
  getIngredientsApi,
  getOrderByNumberApi,
  getOrdersApi,
  getUserApi,
  loginUserApi,
  logoutApi,
  orderBurgerApi,
  refreshToken,
  registerUserApi,
  resetPasswordApi,
  updateUserApi
} from '../src/utils/burger-api';

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

describe('auth api helpers', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('refreshes once for concurrent expired-token requests and does not mutate original headers', async () => {
    localStorage.setItem('refreshToken', 'refresh-old');
    document.cookie = 'accessToken=Bearer expired; path=/';

    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation((url: RequestInfo) => {
      if (String(url).endsWith('/auth/token')) {
        return okResponse({
          success: true,
          accessToken: 'Bearer fresh',
          refreshToken: 'refresh-new'
        });
      }

      const protectedCalls = fetchMock.mock.calls.filter(
        ([callUrl]) => String(callUrl) === '/secure'
      ).length;

      if (protectedCalls <= 2) {
        return failResponse({ message: 'jwt expired' });
      }

      return okResponse({ success: true, value: protectedCalls });
    });

    const options = {
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer expired'
      }
    };

    const [first, second] = await Promise.all([
      fetchWithRefresh<{ success: boolean; value: number }>('/secure', options),
      fetchWithRefresh<{ success: boolean; value: number }>('/secure', options)
    ]);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/auth/token')
      )
    ).toHaveLength(1);
    expect(options.headers.authorization).toBe('Bearer expired');
    expect(fetchMock.mock.calls[3][1].headers.authorization).toBe(
      'Bearer fresh'
    );
  });

  it('refreshes before an authorized request when only refresh token is retained', async () => {
    localStorage.setItem('refreshToken', 'refresh-only');

    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockImplementation((url: RequestInfo) => {
      if (String(url).endsWith('/auth/token')) {
        return okResponse({
          success: true,
          accessToken: 'Bearer restored',
          refreshToken: 'refresh-new'
        });
      }

      return okResponse({ success: true, restored: true });
    });

    const result = await fetchWithRefresh<{
      success: boolean;
      restored: boolean;
    }>('/secure', {
      headers: { authorization: undefined } as unknown as HeadersInit
    });

    expect(result.restored).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/auth/token'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/secure',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer restored' })
      })
    );
  });

  it('supports Headers and tuple header inputs when refreshing authorization', async () => {
    localStorage.setItem('refreshToken', 'refresh-old');
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        okResponse({
          success: true,
          accessToken: 'Bearer fresh',
          refreshToken: 'refresh-new'
        })
      )
      .mockResolvedValueOnce(okResponse({ success: true, ok: 'headers' }))
      .mockResolvedValueOnce(failResponse({ message: 'jwt expired' }))
      .mockResolvedValueOnce(
        okResponse({
          success: true,
          accessToken: 'Bearer newer',
          refreshToken: 'refresh-newer'
        })
      )
      .mockResolvedValueOnce(okResponse({ success: true, ok: 'tuples' }));

    await fetchWithRefresh<{ success: boolean; ok: string }>('/secure', {
      headers: new Headers()
    });
    await fetchWithRefresh<{ success: boolean; ok: string }>('/secure', {
      headers: [['authorization', 'Bearer expired']]
    });

    expect(fetchMock.mock.calls[1][1].headers.authorization).toBe(
      'Bearer fresh'
    );
    expect(fetchMock.mock.calls[4][1].headers.authorization).toBe(
      'Bearer newer'
    );
  });

  it('sends forgot and reset password requests through the api boundary', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue(okResponse({ success: true }));

    await forgotPasswordApi({ email: 'user@example.com' });
    await resetPasswordApi({ password: 'new-password', token: 'code' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/password-reset'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' })
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/password-reset/reset'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'new-password', token: 'code' })
      })
    );
  });

  it('returns successful public catalog and order api responses', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        okResponse({
          success: true,
          data: [{ _id: 'bun', name: 'Bun' }]
        })
      )
      .mockResolvedValueOnce(
        okResponse({ success: true, orders: [], total: 1, totalToday: 1 })
      )
      .mockResolvedValueOnce(okResponse({ success: true, orders: [] }));

    await expect(getIngredientsApi()).resolves.toEqual([
      { _id: 'bun', name: 'Bun' }
    ]);
    await expect(getFeedsApi()).resolves.toMatchObject({ total: 1 });
    await expect(getOrderByNumberApi(42)).resolves.toMatchObject({
      success: true,
      orders: []
    });
  });

  it('rejects unsuccessful catalog/order api responses', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okResponse({ success: false, message: 'No data' }))
      .mockResolvedValueOnce(okResponse({ success: false, message: 'No feed' }))
      .mockResolvedValueOnce(
        okResponse({ success: false, message: 'No orders' })
      )
      .mockResolvedValueOnce(
        okResponse({ success: false, message: 'No burger' })
      )
      .mockResolvedValueOnce(
        okResponse({ success: false, message: 'No register' })
      )
      .mockResolvedValueOnce(
        okResponse({ success: false, message: 'No login' })
      )
      .mockResolvedValueOnce(
        okResponse({ success: false, message: 'No forgot' })
      )
      .mockResolvedValueOnce(
        okResponse({ success: false, message: 'No reset' })
      );

    await expect(getIngredientsApi()).rejects.toMatchObject({ success: false });
    await expect(getFeedsApi()).rejects.toMatchObject({ success: false });
    await expect(getOrdersApi()).rejects.toMatchObject({ success: false });
    await expect(orderBurgerApi(['bun'])).rejects.toMatchObject({
      success: false
    });
    await expect(
      registerUserApi({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'secret'
      })
    ).rejects.toMatchObject({ success: false });
    await expect(
      loginUserApi({ email: 'ada@example.com', password: 'secret' })
    ).rejects.toMatchObject({ success: false });
    await expect(
      forgotPasswordApi({ email: 'ada@example.com' })
    ).rejects.toMatchObject({
      success: false
    });
    await expect(
      resetPasswordApi({ password: 'secret', token: 'token' })
    ).rejects.toMatchObject({ success: false });
  });

  it('returns successful protected auth/order api responses', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(okResponse({ success: true, orders: [] }))
      .mockResolvedValueOnce(
        okResponse({ success: true, order: { number: 42 }, name: 'Burger' })
      )
      .mockResolvedValueOnce(
        okResponse({
          success: true,
          accessToken: 'Bearer access',
          refreshToken: 'refresh',
          user: { name: 'Ada', email: 'ada@example.com' }
        })
      )
      .mockResolvedValueOnce(
        okResponse({
          success: true,
          accessToken: 'Bearer access',
          refreshToken: 'refresh',
          user: { name: 'Ada', email: 'ada@example.com' }
        })
      )
      .mockResolvedValueOnce(
        okResponse({
          success: true,
          user: { name: 'Ada', email: 'ada@example.com' }
        })
      )
      .mockResolvedValueOnce(
        okResponse({
          success: true,
          user: { name: 'Grace', email: 'grace@example.com' }
        })
      )
      .mockResolvedValueOnce(okResponse({ success: true }));

    await expect(getOrdersApi()).resolves.toEqual([]);
    await expect(orderBurgerApi(['bun'])).resolves.toMatchObject({
      name: 'Burger'
    });
    await expect(
      registerUserApi({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'secret'
      })
    ).resolves.toMatchObject({ user: { name: 'Ada' } });
    await expect(
      loginUserApi({ email: 'ada@example.com', password: 'secret' })
    ).resolves.toMatchObject({ user: { email: 'ada@example.com' } });
    await expect(getUserApi()).resolves.toMatchObject({
      user: { name: 'Ada' }
    });
    await expect(updateUserApi({ name: 'Grace' })).resolves.toMatchObject({
      user: { name: 'Grace' }
    });
    await expect(logoutApi()).resolves.toMatchObject({ success: true });
  });

  it('rejects unsuccessful get/update/logout responses', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(okResponse({ success: false, message: 'No user' }))
      .mockResolvedValueOnce(
        okResponse({ success: false, message: 'No update' })
      )
      .mockResolvedValueOnce(
        okResponse({ success: false, message: 'No logout' })
      );

    await expect(getUserApi()).rejects.toMatchObject({ success: false });
    await expect(updateUserApi({ name: 'Ada' })).rejects.toMatchObject({
      success: false
    });
    await expect(logoutApi()).rejects.toMatchObject({ success: false });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clears stale tokens after invalid refresh response', async () => {
    localStorage.setItem('refreshToken', 'stale-refresh');
    document.cookie = 'accessToken=Bearer%20old; path=/';
    (global.fetch as jest.Mock).mockResolvedValue(
      failResponse({ success: false, message: 'Token is invalid' })
    );

    await expect(refreshToken()).rejects.toMatchObject({
      message: 'Token is invalid'
    });

    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(document.cookie).not.toContain('accessToken=');
  });

  it('keeps tokens after transient refresh network failure', async () => {
    localStorage.setItem('refreshToken', 'valid-refresh');
    document.cookie = 'accessToken=Bearer%20old; path=/';
    (global.fetch as jest.Mock).mockRejectedValue(
      new TypeError('Failed to fetch')
    );

    await expect(refreshToken()).rejects.toThrow('Failed to fetch');

    expect(localStorage.getItem('refreshToken')).toBe('valid-refresh');
    expect(document.cookie).toContain('accessToken=');
  });

  it('rejects protected request and clears tokens when refresh token is invalid', async () => {
    localStorage.setItem('refreshToken', 'stale-refresh');
    document.cookie = 'accessToken=Bearer%20expired; path=/';
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(failResponse({ message: 'jwt expired' }))
      .mockResolvedValueOnce(
        failResponse({ success: false, message: 'Token is invalid' })
      );

    await expect(
      fetchWithRefresh<{ success: boolean }>('/secure', {
        headers: { authorization: 'Bearer expired' }
      })
    ).rejects.toMatchObject({ message: 'Token is invalid' });

    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(document.cookie).not.toContain('accessToken=');
  });
});
