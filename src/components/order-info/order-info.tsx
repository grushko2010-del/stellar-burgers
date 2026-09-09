import { FC, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Preloader } from '../ui/preloader';
import { OrderInfoUI } from '@ui';
import { TIngredient } from '@utils-types';
import { useDispatch, useSelector } from '../../services/store';
import {
  selectIngredients,
  selectIngredientsError,
  selectIngredientsLoading
} from '../../services/slices/ingredientsSlice';
import {
  fetchOrderByNumber,
  selectOrderByNumber,
  selectOrderDetailsError,
  selectOrderDetailsLoading,
  setOrderDetailsError
} from '../../services/slices/orderDetailsSlice';
import {
  calculateOrderTotal,
  getOrderIngredientsWithCount
} from '../../services/orderUtils';

export const OrderInfo: FC = () => {
  const dispatch = useDispatch();
  const { number } = useParams();
  const orderNumber = Number(number);

  const orderData = useSelector((state) =>
    Number.isFinite(orderNumber)
      ? selectOrderByNumber(state, orderNumber)
      : null
  );
  const ingredients: TIngredient[] = useSelector(selectIngredients);
  const ingredientsError = useSelector(selectIngredientsError);
  const ingredientsLoading = useSelector(selectIngredientsLoading);
  const isLoading = useSelector(selectOrderDetailsLoading);
  const error = useSelector(selectOrderDetailsError);

  useEffect(() => {
    if (!number || !Number.isFinite(orderNumber)) {
      dispatch(setOrderDetailsError('Некорректный номер заказа'));
      return;
    }

    if (!orderData) {
      dispatch(fetchOrderByNumber(orderNumber));
    }
  }, [dispatch, number, orderNumber, orderData]);

  /* Готовим данные для отображения */
  const orderInfo = useMemo(() => {
    if (!orderData || !ingredients.length) return null;

    const date = new Date(orderData.createdAt);

    const ingredientsInfo = getOrderIngredientsWithCount(
      orderData,
      ingredients
    );
    const total = calculateOrderTotal(orderData, ingredients);

    return {
      ...orderData,
      ingredientsInfo,
      date,
      total
    };
  }, [orderData, ingredients]);

  if (error) {
    return <p className='text text_type_main-medium'>{error}</p>;
  }

  if (ingredientsError) {
    return <p className='text text_type_main-medium'>{ingredientsError}</p>;
  }

  if (orderData && !ingredientsLoading && !ingredients.length) {
    return (
      <p className='text text_type_main-medium'>
        Ингредиенты заказа не найдены
      </p>
    );
  }

  if (isLoading || !orderInfo) {
    return <Preloader />;
  }

  return <OrderInfoUI orderInfo={orderInfo} />;
};
