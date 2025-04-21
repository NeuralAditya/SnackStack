import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Search, 
  ShoppingBag, 
  User,
  Settings
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import CartModal from "./CartModal";
import { useAuth } from "@/hooks/use-auth";

export default function BottomNavigation() {
  const { cart } = useCart();
  const { user } = useAuth();
  const [location] = useLocation();
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50">
        <div className="flex justify-around">
          <Link 
            href="/" 
            className={`flex flex-col items-center py-2 px-4 ${location === "/" ? "text-primary" : "text-gray-600"}`}
          >
            <Home className="text-xl" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          
          <div 
            className="flex flex-col items-center py-2 px-4 text-gray-600"
            onClick={() => setIsCartOpen(true)}
          >
            <div className="relative">
              <ShoppingBag className="text-xl" />
              {itemCount > 0 && (
                <Badge 
                  variant="default" 
                  className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {itemCount}
                </Badge>
              )}
            </div>
            <span className="text-xs mt-1">Cart</span>
          </div>
          
          <Link 
            href="/profile" 
            className={`flex flex-col items-center py-2 px-4 ${location === "/profile" ? "text-primary" : "text-gray-600"}`}
          >
            <User className="text-xl" />
            <span className="text-xs mt-1">Profile</span>
          </Link>
          
          {user?.isAdmin && (
            <Link 
              href="/admin" 
              className={`flex flex-col items-center py-2 px-4 ${location === "/admin" ? "text-primary" : "text-gray-600"}`}
            >
              <Settings className="text-xl" />
              <span className="text-xs mt-1">Admin</span>
            </Link>
          )}
        </div>
      </div>
      
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
