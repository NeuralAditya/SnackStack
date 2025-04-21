import { useQuery } from "@tanstack/react-query";
import { Meal } from "@shared/schema";

export function useMeals() {
  const {
    data: meals,
    isLoading,
    error,
  } = useQuery<Meal[]>({
    queryKey: ["/api/meals"],
  });

  return {
    meals,
    isLoading,
    error,
  };
}

export function useMealById(id: number | null) {
  const {
    data: meal,
    isLoading,
    error,
  } = useQuery<Meal>({
    queryKey: ["/api/meals", id],
    enabled: !!id, // Only run query if id is provided
  });

  return {
    meal,
    isLoading,
    error,
  };
}

export function useMealsByCategory(category: string | null) {
  const {
    data: meals,
    isLoading,
    error,
  } = useQuery<Meal[]>({
    queryKey: [`/api/meals/category/${category}`],
    enabled: !!category && category !== "All", // Only run query if category is provided and not "All"
  });

  return {
    meals,
    isLoading,
    error,
  };
}
