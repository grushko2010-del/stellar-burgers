import { useEffect } from 'react';
import { useDispatch } from './store';
import { createOrdersPolling } from './orderPolling';
import { fetchFeeds } from './slices/feedSlice';
import { fetchUserOrders } from './slices/ordersSlice';

export const useFeedOrdersPolling = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const polling = createOrdersPolling(() => {
      dispatch(fetchFeeds());
    });

    polling.start();

    return () => polling.stop();
  }, [dispatch]);
};

export const useProfileOrdersPolling = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const polling = createOrdersPolling(() => {
      dispatch(fetchUserOrders());
    });

    polling.start();

    return () => polling.stop();
  }, [dispatch]);
};
