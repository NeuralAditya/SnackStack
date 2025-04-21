import { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, PlusCircle, Utensils } from "lucide-react";
import { CreditCard } from "lucide-react";
import MealDetailModal from "./MealDetailModal";
import { useCart } from "@/hooks/use-cart";
import { Meal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MealCardProps {
  meal: Meal;
}

export default function MealCard({ meal }: MealCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const { addToCartMutation } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCartMutation.mutate(
      { mealId: meal.id, quantity: 1 },
      {
        onSuccess: () => {
          toast({
            title: "Added to cart",
            description: `${meal.name} has been added to your cart`,
          });
        }
      }
    );
  };

  const getTagBadgeVariant = (tag: string) => {
    if (tag === "Vegetarian" || tag === "Vegan") return "success";
    if (tag === "Popular") return "info";
    return "default";
  };

  const primaryTag = meal.tags && meal.tags.length > 0 ? meal.tags[0] : null;

  return (
    <>
      <Card 
        className="overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        <div className="relative">
          <AspectRatio ratio={16/9}>
            <img 
              src={meal.imageUrl} 
              alt={meal.name} 
              className="object-cover w-full h-full"
            />
          </AspectRatio>
          <Badge 
            variant="accent" 
            className="absolute top-3 right-3 flex items-center"
          >
            <CreditCard className="h-3 w-3 mr-1" />
            {meal.pointCost} pts
          </Badge>
          
          {primaryTag && (
            <Badge 
              variant={getTagBadgeVariant(primaryTag)} 
              className="absolute top-3 left-3 text-xs"
            >
              {primaryTag}
            </Badge>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg mb-1">{meal.name}</h3>
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">{meal.description}</p>
            </div>
            <Button 
              size="icon" 
              className="rounded-full h-8 w-8 flex-shrink-0" 
              onClick={handleAddToCart}
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 mt-2">
            <div className="flex items-center mr-4">
              <Clock className="h-4 w-4 mr-1" />
              <span>{meal.prepTime}</span>
            </div>
            <div className="flex items-center">
              <Utensils className="h-4 w-4 mr-1" />
              <span>{meal.restaurantName}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <MealDetailModal 
        meal={meal}
        isOpen={showDetail} 
        onClose={() => setShowDetail(false)} 
      />
    </>
  );
}
