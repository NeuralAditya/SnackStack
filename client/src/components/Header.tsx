import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  ShoppingBag, 
  User, 
  Clock, 
  Settings, 
  LogOut, 
  Menu, 
  CreditCard,
  Home
} from "lucide-react";
import { MdRestaurant } from "react-icons/md";
import CartModal from "./CartModal";

export default function Header({ searchQuery = "", onSearchChange = () => {} }: { 
  searchQuery?: string, 
  onSearchChange?: (query: string) => void 
}) {
  const { user, logoutMutation } = useAuth();
  const { cart } = useCart();
  const [location] = useLocation();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  const getUserInitials = () => {
    if (!user) return "";
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center">
            <MdRestaurant className="text-primary text-3xl mr-2" />
            <span className="font-bold text-xl">SnackStack</span>
          </Link>
          {user && (
            <Badge variant="points" className="hidden md:flex items-center px-3 py-1 rounded-full">
              <CreditCard className="h-4 w-4 mr-1" />
              <span className="font-medium text-sm">{user.points} points</span>
            </Badge>
          )}
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          {location === "/" && (
            <div className="relative">
              <Input
                type="text"
                placeholder="Search meals..."
                className="bg-gray-100 rounded-full pl-10 w-64"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          )}
          
          <Button 
            variant="ghost" 
            className="relative p-2" 
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
                {itemCount}
              </span>
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gray-200 text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{user?.firstName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Order History</span>
                </DropdownMenuItem>
                {user?.isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon"
          className="md:hidden" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>
      
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white py-3 px-4 shadow-inner">
          <div className="flex items-center mb-4">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarFallback className="bg-gray-200">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user?.firstName} {user?.lastName}</p>
              <Badge variant="points" className="flex items-center px-2 py-0.5">
                <CreditCard className="h-3 w-3 mr-1" />
                <span className="text-sm">{user?.points} points</span>
              </Badge>
            </div>
          </div>
          
          {location === "/" && (
            <div className="relative mb-4">
              <Input
                type="text"
                placeholder="Search meals..."
                className="bg-gray-100 rounded-full pl-10 w-full"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          )}
          
          <nav className="space-y-2">
            <Link href="/" className="flex items-center py-2 px-3 rounded-lg hover:bg-gray-100">
              <Home className="mr-3 h-5 w-5 text-gray-500" />
              <span>Home</span>
            </Link>
            <Link href="/profile" className="flex items-center py-2 px-3 rounded-lg hover:bg-gray-100">
              <User className="mr-3 h-5 w-5 text-gray-500" />
              <span>My Profile</span>
            </Link>
            <div 
              className="flex items-center py-2 px-3 rounded-lg hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsCartOpen(true);
              }}
            >
              <ShoppingBag className="mr-3 h-5 w-5 text-gray-500" />
              <span>Cart</span>
              {itemCount > 0 && (
                <Badge variant="default" className="ml-auto">{itemCount}</Badge>
              )}
            </div>
            {user?.isAdmin && (
              <Link href="/admin" className="flex items-center py-2 px-3 rounded-lg hover:bg-gray-100">
                <Settings className="mr-3 h-5 w-5 text-gray-500" />
                <span>Admin Dashboard</span>
              </Link>
            )}
            <div 
              className="flex items-center py-2 px-3 rounded-lg hover:bg-gray-100 text-red-500 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              <span>Logout</span>
            </div>
          </nav>
        </div>
      )}
      
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}
