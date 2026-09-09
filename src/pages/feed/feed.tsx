import { Preloader } from '@ui';
import { FeedUI } from '@ui-pages';
import { TOrder } from '@utils-types';
import { FC } from 'react';
import { useDispatch, useSelector } from '../../services/store';
import { fetchFeeds } from '../../services/slices/feedSlice';
import {
  selectFeedError,
  selectFeedOrders,
  selectFeedLoading
} from '../../services/slices/feedSlice';
import { useFeedOrdersPolling } from '../../services/useOrderStream';

export const Feed: FC = () => {
  const dispatch = useDispatch();
  const orders: TOrder[] = useSelector(selectFeedOrders);
  const isLoading = useSelector(selectFeedLoading);
  const error = useSelector(selectFeedError);

  useFeedOrdersPolling();

  if (isLoading && !orders.length) {
    return <Preloader />;
  }

  return (
    <FeedUI
      orders={orders}
      error={error}
      handleGetFeeds={() => dispatch(fetchFeeds())}
    />
  );
};
