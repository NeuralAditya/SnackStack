import { useState } from "react";
import { 
  Dialog, 
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "./ui/aspect-ratio";
import { Clock, CreditCard, Utensils, Plus, Minus, Tag, ShoppingBag } from "lucide-react";
import { Meal } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

interface MealDetailModalProps {
  meal: Meal;
  isOpen: boolean;
  onClose: () => void;
}

export default function MealDetailModal({ meal, isOpen, onClose }: MealDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const { addToCartMutation } = useCart();
  const { toast } = useToast();

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    addToCartMutation.mutate(
      { mealId: meal.id, quantity },
      {
        onSuccess: () => {
          toast({
            title: "Added to cart",
            description: `${meal.name} has been added to your cart`,
          });
          onClose();
          setQuantity(1); // Reset quantity
        }
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto">
        <div className="relative">
          <AspectRatio ratio={16/9}>
            <img 
              src={meal.imageUrl} 
              alt={meal.name} 
              className="object-cover w-full h-full rounded-t-lg"
            />
          </AspectRatio>
          <Badge 
            variant="accent" 
            className="absolute bottom-4 right-4 flex items-center"
          >
            <CreditCard className="h-3 w-3 mr-1" />
            {meal.pointCost} pts
          </Badge>
        </div>
        
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">{meal.name}</DialogTitle>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <div className="flex items-center mr-4">
              <Clock className="h-4 w-4 mr-1" />
              <span>{meal.prepTime}</span>
            </div>
            <div className="flex items-center">
              <Utensils className="h-4 w-4 mr-1" />
              <span>{meal.restaurantName}</span>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-700">{meal.description}</p>
          
          {meal.tags && meal.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {meal.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="flex items-center">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {meal.nutritionInfo && (
            <div>
              <h3 className="font-medium mb-2">Nutritional Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-gray-600">Calories:</span>
                  <span className="font-medium">{meal.nutritionInfo.calories} kcal</span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-gray-600">Protein:</span>
                  <span className="font-medium">{meal.nutritionInfo.protein}g</span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-gray-600">Carbs:</span>
                  <span className="font-medium">{meal.nutritionInfo.carbs}g</span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-gray-600">Fat:</span>
                  <span className="font-medium">{meal.nutritionInfo.fat}g</span>
                </div>
              </div>
            </div>
          )}
          
          {meal.allergens && meal.allergens.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Allergens</h3>
              <div className="flex flex-wrap gap-2">
                {meal.allergens.map((allergen, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    {allergen}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <Separator className="my-2" />
        
        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
          <div className="flex items-center">
            <Button
              variant="outline" 
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="mx-4 font-medium">{quantity}</span>
            <Button
              variant="outline" 
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleAddToCart}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
