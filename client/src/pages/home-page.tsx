import { useState, useEffect } from "react";
import Header from "@/components/Header";
import CategoryFilters from "@/components/CategoryFilters";
import MealCard from "@/components/MealCard";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Meal } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, HandPlatter, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMeals } from "@/hooks/use-meals";

export default function HomePage() {
  const { user } = useAuth();
  const { meals, isLoading } = useMeals();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("popular");
  const [displayedMeals, setDisplayedMeals] = useState<Meal[]>([]);
  const [visibleCount, setVisibleCount] = useState(8);

  const categories = ["Breakfast", "Lunch", "Dinner", "Snacks", "Vegetarian", "Vegan", "Gluten-Free"];

  // Filter and sort meals
  useEffect(() => {
    if (!meals) return;

    let filtered = [...meals];
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(meal => 
        meal.name.toLowerCase().includes(query) || 
        meal.description.toLowerCase().includes(query) ||
        meal.restaurantName.toLowerCase().includes(query) ||
        (meal.tags && meal.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter(meal => 
        meal.category === selectedCategory || 
        (meal.tags && meal.tags.includes(selectedCategory))
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case "priceAsc":
        filtered.sort((a, b) => a.pointCost - b.pointCost);
        break;
      case "priceDesc":
        filtered.sort((a, b) => b.pointCost - a.pointCost);
        break;
      case "nameAsc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "popular":
      default:
        // Assume meals with "Popular" tag come first, then sort by pointCost
        filtered.sort((a, b) => {
          const aIsPopular = a.tags && a.tags.includes("Popular");
          const bIsPopular = b.tags && b.tags.includes("Popular");
          if (aIsPopular && !bIsPopular) return -1;
          if (!aIsPopular && bIsPopular) return 1;
          return b.pointCost - a.pointCost; // Higher price meals tend to be more popular
        });
        break;
    }
    
    setDisplayedMeals(filtered);
    // Reset visible count when filters change
    setVisibleCount(8);
  }, [meals, searchQuery, selectedCategory, sortBy]);

  const loadMore = () => {
    setVisibleCount(prev => prev + 8);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-accent text-white py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="md:flex md:items-center md:space-x-8">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h1 className="font-bold text-3xl md:text-4xl lg:text-5xl mb-4">
                Delicious meals.<br />
                <span className="text-white opacity-90">Just points away.</span>
              </h1>
              <p className="text-gray-100 mb-6 md:text-lg">
                Order tasty meals from campus eateries using your meal points.
                No cash needed!
              </p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <Button 
                  variant="secondary"
                  className="font-medium rounded-full"
                  onClick={() => document.getElementById('meals-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <HandPlatter className="mr-2 h-4 w-4" />
                  Start Ordering
                </Button>
                <Button 
                  variant="outline"
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:bg-opacity-10 rounded-full"
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  How It Works
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 relative">
              <div className="bg-white p-3 rounded-xl shadow-xl transform -rotate-2">
                <img 
                  src="https://images.unsplash.com/photo-1565299507177-b0ac66763828?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                  alt="Delicious campus meal" 
                  className="rounded-lg w-full h-64 object-cover"
                />
                <div className="absolute -bottom-4 -right-4 bg-secondary text-white p-3 rounded-lg shadow-lg transform rotate-3">
                  <span className="font-bold">Ready in 15 min!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Category Filters */}
      <CategoryFilters 
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      
      {/* Meals Grid */}
      <section id="meals-section" className="py-8 flex-grow">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-gray-500">Loading meals...</p>
            </div>
          ) : displayedMeals.length === 0 ? (
            <div className="text-center py-12">
              <HandPlatter className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">No meals found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery.trim() 
                  ? "Try a different search term or category."
                  : "There are no meals available in this category."}
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
              >
                View All Meals
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedMeals.slice(0, visibleCount).map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </div>
              
              {visibleCount < displayedMeals.length && (
                <div className="mt-8 text-center">
                  <Button 
                    variant="outline"
                    className="border border-primary text-primary hover:bg-primary hover:text-white transition duration-300 rounded-full"
                    onClick={loadMore}
                  >
                    Load More Meals
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      
      <BottomNavigation />
    </div>
  );
}
