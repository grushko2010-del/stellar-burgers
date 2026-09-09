import { TOrder } from '@utils-types';

export type FeedUIProps = {
  orders: TOrder[];
  error?: string | null;
  handleGetFeeds: () => void;
};
