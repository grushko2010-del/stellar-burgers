async (page) => {
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(10000);
  const image =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><ellipse cx="120" cy="65" rx="90" ry="38" fill="#7153cc"/><path d="M40 70H200" stroke="#e2ba7a" stroke-width="22"/></svg>'
    );
  const base = {
    proteins: 10,
    fat: 2,
    carbohydrates: 20,
    calories: 150,
    image,
    image_large: image,
    image_mobile: image
  };
  const ingredients = [
    { ...base, _id: 'bun', name: 'Космическая булка', type: 'bun', price: 100 },
    { ...base, _id: 'main', name: 'Звёздная начинка', type: 'main', price: 50 },
    {
      ...base,
      _id: 'sauce',
      name: 'Галактический соус',
      type: 'sauce',
      price: 25
    }
  ];
  let user = { name: 'Тестовый пользователь', email: 'student@example.test' };
  let orders = [
    {
      _id: 'initial-order',
      number: 4100,
      name: 'Космический бургер',
      status: 'done',
      ingredients: ['bun', 'main', 'bun'],
      createdAt: '2026-09-09T10:00:00Z',
      updatedAt: '2026-09-09T10:00:00Z'
    }
  ];
  await page.context().clearCookies();
  await page.unroute('**/api/**');
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = request.url().split('/api')[1].split('?')[0];
    const method = request.method();
    const body = request.postDataJSON();
    let response = { success: true };
    let status = 200;
    if (path === '/ingredients') response = { ...response, data: ingredients };
    else if (path === '/auth/login' || path === '/auth/register') {
      if (path === '/auth/register')
        user = { name: body.name, email: body.email };
      response = {
        ...response,
        user,
        accessToken: 'Bearer test-access-token',
        refreshToken: 'test-refresh-token'
      };
    } else if (path === '/auth/user') {
      if (!request.headers().authorization) {
        status = 401;
        response = { success: false, message: 'You should be authorised' };
      } else {
        if (method === 'PATCH') user = { ...user, ...body };
        response = { ...response, user };
      }
    } else if (path === '/orders' && method === 'POST') {
      if (
        JSON.stringify(body.ingredients) !==
        JSON.stringify(['bun', 'main', 'bun'])
      )
        throw new Error('Wrong checkout ingredient IDs');
      if (!request.headers().authorization)
        throw new Error('Missing order authorization');
      const order = {
        ...orders[0],
        _id: 'created-order',
        number: 4242,
        ingredients: body.ingredients
      };
      orders = [order, ...orders];
      response = { ...response, order, name: order.name };
    } else if (path === '/orders/all' || path === '/orders')
      response = {
        ...response,
        orders,
        total: orders.length,
        totalToday: orders.length
      };
    else if (/^\/orders\/\d+$/.test(path))
      response = {
        ...response,
        orders: orders.filter(
          (order) => order.number === Number(path.split('/').pop())
        )
      };
    else if (
      !['/auth/logout', '/password-reset', '/password-reset/reset'].includes(
        path
      )
    ) {
      status = 404;
      response = {
        success: false,
        message: 'Unexpected test API request: ' + path
      };
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
  await page.goto('http://localhost:4000');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.getByText('Космическая булка', { exact: true }).waitFor();
  return 'Fixture API enabled in this isolated browser session only.';
}
