import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Clock, 
  MessageSquare, 
  ShoppingBag, 
  Plus, 
  Minus, 
  XCircle 
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { insertOrderSchema } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const { cart, updateCartItemMutation, removeFromCartMutation } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pickupTime, setPickupTime] = useState("As soon as possible");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateSubtotal = () => {
    if (!cart?.items.length) return 0;
    return cart.items.reduce((sum, item) => sum + (item.meal.pointCost * item.quantity), 0);
  };

  const calculateServiceFee = () => {
    return Math.max(25, Math.round(calculateSubtotal() * 0.05));
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateServiceFee();
  };

  const calculateRemainingPoints = () => {
    if (!user) return 0;
    return user.points - calculateTotal();
  };

  const handleQuantityChange = (cartItemId: number, quantity: number) => {
    if (quantity < 1) return;

    updateCartItemMutation.mutate(
      { cartItemId, quantity },
      {
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleRemoveItem = (cartItemId: number) => {
    removeFromCartMutation.mutate(
      { cartItemId },
      {
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleCompleteOrder = async () => {
    if (!cart?.items.length) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Add items before completing order.",
        variant: "destructive",
      });
      return;
    }

    if (!user || calculateTotal() > user.points) {
      toast({
        title: "Insufficient Points",
        description: "You don't have enough points to complete this order.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const orderData = {
        pickupTime,
        specialInstructions: specialInstructions || undefined,
      };

      const res = await apiRequest("POST", "/api/orders", orderData);
      const order = await res.json();

      // Invalidate queries that need updating
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); // Added to reflect order history

      toast({
        title: "Order Placed!",
        description: `Your order #${order.id} has been successfully placed. It is now being prepared.`,
        duration: 5000,
      });

      // Close the modal
      onClose();

      // Clear form state
      setPickupTime("As soon as possible");
      setSpecialInstructions("");
    } catch (error) {
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "Failed to place order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCartEmpty = !cart?.items || cart.items.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Your Cart
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-grow py-2">
          {isCartEmpty ? (
            <div className="py-8 text-center">
              <div className="mx-auto bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <ShoppingBag className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-lg mb-1">Your cart is empty</h3>
              <p className="text-gray-500 text-sm">Add delicious meals to get started</p>
              <Button 
                className="mt-4"
                onClick={onClose}
              >
                Browse Meals
              </Button>
            </div>
          ) : (
            <>
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center py-3 border-b border-gray-100">
                  <img 
                    src={item.meal.imageUrl}
                    alt={item.meal.name} 
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="ml-4 flex-grow">
                    <h4 className="font-medium">{item.meal.name}</h4>
                    <div className="flex items-center text-sm text-gray-500">
                      <CreditCard className="h-3 w-3 mr-1 text-accent" />
                      <span>{item.meal.pointCost} points</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="outline" 
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="mx-3 font-medium">{item.quantity}</span>
                    <Button
                      variant="outline" 
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 ml-2 text-gray-400 hover:text-red-500"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Order Details</h4>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Subtotal:</span>
                  <div className="flex items-center font-medium">
                    <CreditCard className="h-3 w-3 mr-1 text-accent" />
                    <span>{calculateSubtotal()} points</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-600">Service Fee:</span>
                  <div className="flex items-center font-medium">
                    <CreditCard className="h-3 w-3 mr-1 text-accent" />
                    <span>{calculateServiceFee()} points</span>
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="pt-2 flex justify-between">
                  <span className="font-medium">Total:</span>
                  <div className="flex items-center font-semibold">
                    <CreditCard className="h-4 w-4 mr-1 text-accent" />
                    <span>{calculateTotal()} points</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-3">Pickup Details</h4>
                <div className="flex mb-4">
                  <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="block font-medium mb-1">Pickup Time</span>
                    <Select 
                      value={pickupTime} 
                      onValueChange={setPickupTime}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select pickup time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="As soon as possible">As soon as possible</SelectItem>
                        <SelectItem value="12:00 PM - 12:15 PM">12:00 PM - 12:15 PM</SelectItem>
                        <SelectItem value="12:15 PM - 12:30 PM">12:15 PM - 12:30 PM</SelectItem>
                        <SelectItem value="12:30 PM - 12:45 PM">12:30 PM - 12:45 PM</SelectItem>
                        <SelectItem value="12:45 PM - 1:00 PM">12:45 PM - 1:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex">
                  <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="block font-medium mb-1">Special Instructions</span>
                    <Textarea 
                      placeholder="Any special requests for your order?"
                      className="resize-none"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {!isCartEmpty && (
          <DialogFooter className="flex-col sm:flex-col gap-2 sm:gap-2">
            <div className="flex items-center justify-between w-full mb-2">
              <div>
                <span className="text-sm text-gray-600">Your Balance:</span>
                <div className="flex items-center font-semibold">
                  <CreditCard className="h-4 w-4 mr-1 text-accent" />
                  <span>{user?.points || 0} points</span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">After Purchase:</span>
                <div className="flex items-center font-semibold">
                  <CreditCard className="h-4 w-4 mr-1 text-accent" />
                  <span>{calculateRemainingPoints()} points</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full"
              onClick={handleCompleteOrder}
              disabled={isSubmitting || !user || calculateTotal() > user.points}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Complete Order
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}