import clsx from 'clsx';
import { FC, memo } from 'react';

import styles from './feed.module.css';

import { FeedUIProps } from './type';
import { OrdersList, FeedInfo } from '@components';
import { RefreshButton } from '@zlden/react-developer-burger-ui-components';

export const FeedUI: FC<FeedUIProps> = memo(
  ({ orders, error, handleGetFeeds }) => (
    <main className={styles.containerMain}>
      <div className={clsx(styles.titleBox, 'mt-10 mb-5')}>
        <h1 className={clsx(styles.title, 'text text_type_main-large')}>
          Лента заказов
        </h1>
        <RefreshButton
          text='Обновить'
          onClick={handleGetFeeds}
          extraClass={'ml-30'}
        />
      </div>
      {error && (
        <p
          className='text text_type_main-default text_color_inactive'
          role='alert'
        >
          {error}
        </p>
      )}
      <div className={styles.main}>
        <div className={styles.columnOrders}>
          <OrdersList orders={orders} />
        </div>
        <div className={styles.columnInfo}>
          <FeedInfo />
        </div>
      </div>
    </main>
  )
);
