import { TIngredient, TOrder } from '@utils-types';

export type TIngredientsWithCount = {
  [key: string]: TIngredient & { count: number };
};

export const collectOrderIngredients = (
  ingredientIds: string[],
  ingredients: TIngredient[]
) =>
  ingredientIds.reduce((acc: TIngredient[], ingredientId) => {
    const ingredient = ingredients.find((item) => item._id === ingredientId);
    return ingredient ? [...acc, ingredient] : acc;
  }, []);

export const getOrderIngredientsWithCount = (
  order: TOrder,
  ingredients: TIngredient[]
) => {
  const ingredientsInfo = order.ingredients.reduce(
    (acc: TIngredientsWithCount, ingredientId) => {
      const ingredient = ingredients.find((item) => item._id === ingredientId);

      if (!ingredient) {
        return acc;
      }

      const currentCount = acc[ingredientId]?.count ?? 0;

      return {
        ...acc,
        [ingredientId]: {
          ...ingredient,
          count: currentCount + 1
        }
      };
    },
    {}
  );

  return Object.fromEntries(
    Object.entries(ingredientsInfo).map(([ingredientId, ingredient]) => [
      ingredientId,
      {
        ...ingredient,
        count:
          ingredient.type === 'bun'
            ? Math.max(ingredient.count, 2)
            : ingredient.count
      }
    ])
  );
};

export const calculateOrderTotal = (
  order: TOrder,
  ingredients: TIngredient[]
) =>
  Object.values(getOrderIngredientsWithCount(order, ingredients)).reduce(
    (total, ingredient) => total + ingredient.price * ingredient.count,
    0
  );
