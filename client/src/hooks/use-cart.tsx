import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { CartItem } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type CartContextType = {
  cart: CartData | null;
  isLoading: boolean;
  error: Error | null;
  addToCartMutation: UseMutationResult<any, Error, AddToCartData>;
  updateCartItemMutation: UseMutationResult<any, Error, UpdateCartItemData>;
  removeFromCartMutation: UseMutationResult<any, Error, RemoveFromCartData>;
  clearCartMutation: UseMutationResult<any, Error, void>;
};

type CartData = {
  cart: {
    id: number;
    userId: number;
  };
  items: (CartItem & { meal: any })[];
};

type AddToCartData = {
  mealId: number;
  quantity: number;
};

type UpdateCartItemData = {
  cartItemId: number;
  quantity: number;
};

type RemoveFromCartData = {
  cartItemId: number;
};

export const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const {
    data: cart,
    error,
    isLoading,
  } = useQuery<CartData | null>({
    queryKey: ["/api/cart"],
    enabled: !!user, // Only fetch cart if user is logged in
  });

  const addToCartMutation = useMutation({
    mutationFn: async (data: AddToCartData) => {
      const res = await apiRequest("POST", "/api/cart/items", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add to cart",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCartItemMutation = useMutation({
    mutationFn: async ({ cartItemId, quantity }: UpdateCartItemData) => {
      const res = await apiRequest("PUT", `/api/cart/items/${cartItemId}`, { quantity });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update cart",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async ({ cartItemId }: RemoveFromCartData) => {
      await apiRequest("DELETE", `/api/cart/items/${cartItemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/cart");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to clear cart",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <CartContext.Provider
      value={{
        cart: cart ?? null,
        isLoading,
        error,
        addToCartMutation,
        updateCartItemMutation,
        removeFromCartMutation,
        clearCartMutation,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
