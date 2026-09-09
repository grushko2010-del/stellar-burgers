import { FC } from 'react';
import { Button } from '@zlden/react-developer-burger-ui-components';
import styles from './constructor-page.module.css';
import { useDispatch, useSelector } from '../../services/store';
import { fetchIngredients } from '../../services/slices/ingredientsSlice';
import {
  selectIngredientsLoading,
  selectIngredientsError
} from '../../services/slices/ingredientsSlice';
import { ConstructorPageUI } from '@ui-pages';

export const ConstructorPage: FC = () => {
  const dispatch = useDispatch();
  const isIngredientsLoading = useSelector(selectIngredientsLoading);
  const error = useSelector(selectIngredientsError);

  if (error)
    return (
      <main className={styles.errorState}>
        <h1 className='text text_type_main-large'>Соберите бургер</h1>
        <p role='alert' className='text text_type_main-medium mt-10'>
          Не удалось загрузить ингредиенты
        </p>
        <p className='text text_type_main-default text_color_inactive mt-4 mb-6'>
          Проверьте соединение с интернетом и повторите попытку.
        </p>
        <Button htmlType='button' onClick={() => dispatch(fetchIngredients())}>
          Повторить загрузку
        </Button>
      </main>
    );

  return <ConstructorPageUI isIngredientsLoading={isIngredientsLoading} />;
};
