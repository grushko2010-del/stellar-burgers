import { FC } from 'react';
import { useSelector } from '../../services/store';
import {
  selectIngredients,
  selectIngredientsLoading,
  selectIngredientsError,
  selectIngredientsLoaded
} from '../../services/slices/ingredientsSlice';
import { useParams } from 'react-router-dom';
import { Preloader } from '../ui/preloader';
import { IngredientDetailsUI } from '../ui/ingredient-details';

export const IngredientDetails: FC = () => {
  const { id } = useParams<{ id: string }>();
  const ingredients = useSelector(selectIngredients);
  const loading = useSelector(selectIngredientsLoading);
  const error = useSelector(selectIngredientsError);
  const loaded = useSelector(selectIngredientsLoaded);
  const ingredientData = ingredients.find((item) => item._id === id);

  if (loading || !loaded) {
    return <Preloader />;
  }

  if (error)
    return (
      <p role='alert' className='text text_type_main-default'>
        {error}
      </p>
    );
  if (!ingredientData)
    return <p className='text text_type_main-medium'>Ингредиент не найден</p>;

  return <IngredientDetailsUI ingredientData={ingredientData} />;
};
