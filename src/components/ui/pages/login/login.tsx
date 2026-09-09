import { FC, useState } from 'react';
import clsx from 'clsx';
import {
  Input,
  Button,
  PasswordInput
} from '@zlden/react-developer-burger-ui-components';
import styles from '../common.module.css';
import { Link } from 'react-router-dom';
import { LoginUIProps } from './type';

export const LoginUI: FC<LoginUIProps> = ({
  email,
  setEmail,
  errorText,
  handleSubmit,
  password,
  setPassword,
  isLoading
}) => (
  <main className={styles.container}>
    <div className={clsx('pt-6', styles.wrapCenter)}>
      <h3 className='pb-6 text text_type_main-medium'>Вход</h3>
      <form
        className={clsx('pb-15', styles.form)}
        name='login'
        onSubmit={handleSubmit}
      >
        <>
          <div className='pb-6'>
            <Input
              type='email'
              placeholder='E-mail'
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              name='email'
              error={false}
              errorText=''
              size='default'
            />
          </div>
          <div className='pb-6'>
            <PasswordInput
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              name='password'
            />
          </div>
          <div className={clsx('pb-6', styles.button)}>
            <Button
              type='primary'
              size='medium'
              htmlType='submit'
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </div>
          {errorText && (
            <p
              className={clsx(styles.error, 'text text_type_main-default pb-6')}
            >
              {errorText}
            </p>
          )}
        </>
      </form>
      <div
        className={clsx('pb-4', styles.question, 'text text_type_main-default')}
      >
        Вы - новый пользователь?
        <Link to='/register' className={clsx('pl-2', styles.link)}>
          Зарегистрироваться
        </Link>
      </div>
      <div
        className={clsx(styles.question, 'text text_type_main-default pb-6')}
      >
        Забыли пароль?
        <Link to={'/forgot-password'} className={clsx('pl-2', styles.link)}>
          Восстановить пароль
        </Link>
      </div>
    </div>
  </main>
);
