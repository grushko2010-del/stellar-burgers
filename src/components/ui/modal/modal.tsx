import { FC, memo } from 'react';
import clsx from 'clsx';

import styles from './modal.module.css';

import { CloseIcon } from '@zlden/react-developer-burger-ui-components';
import { TModalUIProps } from './type';
import { ModalOverlayUI } from '@ui';

export const ModalUI: FC<TModalUIProps> = memo(
  ({ title, onClose, children }) => (
    <>
      <div
        className={styles.modal}
        role='dialog'
        aria-modal='true'
        aria-label={title || 'Заказ оформлен'}
      >
        <div className={styles.header}>
          <h3 className={clsx(styles.title, 'text text_type_main-large')}>
            {title}
          </h3>
          <button
            className={styles.button}
            type='button'
            onClick={onClose}
            aria-label='Закрыть'
          >
            <CloseIcon type='primary' />
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
      <ModalOverlayUI onClick={onClose} />
    </>
  )
);
