export const ORDER_POLLING_INTERVAL = 5000;

export const createOrdersPolling = (
  fetchOrders: () => void,
  interval = ORDER_POLLING_INTERVAL
) => {
  let timer: ReturnType<typeof setInterval> | null = null;

  const start = () => {
    if (timer) {
      return;
    }

    fetchOrders();
    timer = setInterval(fetchOrders, interval);
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    start,
    stop
  };
};
