import clsx from 'clsx';
import { FC } from 'react';

import styles from './profile-orders.module.css';

import { ProfileOrdersUIProps } from './type';
import { ProfileMenu, OrdersList } from '@components';
import { RefreshButton } from '@zlden/react-developer-burger-ui-components';

export const ProfileOrdersUI: FC<ProfileOrdersUIProps> = ({
  orders,
  error,
  handleGetOrders
}) => (
  <main className={clsx(styles.main)}>
    <div className={clsx('mt-30 mr-15', styles.menu)}>
      <ProfileMenu />
    </div>
    <div className={clsx('mt-10', styles.orders)}>
      {error && (
        <div role='alert'>
          <span className='text text_type_main-default text_color_inactive'>
            {error}
          </span>
          {handleGetOrders && (
            <RefreshButton
              text='Обновить'
              onClick={handleGetOrders}
              extraClass='ml-4'
            />
          )}
        </div>
      )}
      <OrdersList orders={orders} />
    </div>
  </main>
);
