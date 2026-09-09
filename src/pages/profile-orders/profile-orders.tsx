import { FC } from 'react';
import { useDispatch, useSelector } from '../../services/store';
import {
  fetchUserOrders,
  selectUserOrders,
  selectUserOrdersError,
  selectUserOrdersLoading
} from '../../services/slices/ordersSlice';
import { ProfileOrdersUI } from '@ui-pages';
import { Preloader } from '@ui';
import { useProfileOrdersPolling } from '../../services/useOrderStream';

export const ProfileOrders: FC = () => {
  const dispatch = useDispatch();
  const orders = useSelector(selectUserOrders);
  const isLoading = useSelector(selectUserOrdersLoading);
  const error = useSelector(selectUserOrdersError);

  useProfileOrdersPolling();

  if (isLoading && !orders.length) {
    return <Preloader />;
  }

  return (
    <ProfileOrdersUI
      orders={orders}
      error={error}
      handleGetOrders={() => dispatch(fetchUserOrders())}
    />
  );
};
