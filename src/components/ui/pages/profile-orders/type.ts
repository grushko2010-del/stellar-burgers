import { TOrder } from '@utils-types';

export type ProfileOrdersUIProps = {
  orders: TOrder[];
  error?: string | null;
  handleGetOrders?: () => void;
};
