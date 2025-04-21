import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryFiltersProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  sortBy: string;
  onSortChange: (sortOption: string) => void;
}

export default function CategoryFilters({
  categories,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSortChange
}: CategoryFiltersProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = direction === 'left' 
        ? scrollRef.current.scrollLeft - scrollAmount 
        : scrollRef.current.scrollLeft + scrollAmount;
      
      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
      
      // Update button visibility after scroll
      setTimeout(checkScrollButtons, 300);
    }
  };

  const handleCategoryChange = (category: string) => {
    onSelectCategory(category);
  };

  return (
    <section className="py-6 bg-white shadow-sm sticky top-16 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-xl">Today's Menu</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="bg-gray-100 text-sm rounded-md h-8 w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="priceAsc">Points: Low to High</SelectItem>
                <SelectItem value="priceDesc">Points: High to Low</SelectItem>
                <SelectItem value="nameAsc">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="relative">
          {showLeftScroll && (
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full h-8 w-8"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div 
            ref={scrollRef}
            className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth px-2"
            onScroll={checkScrollButtons}
          >
            <Button
              variant={selectedCategory === "All" ? "default" : "outline"}
              className="whitespace-nowrap rounded-full"
              onClick={() => handleCategoryChange("All")}
            >
              All Meals
            </Button>
            
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="whitespace-nowrap rounded-full"
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </Button>
            ))}
          </div>
          
          {showRightScroll && (
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full h-8 w-8"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
