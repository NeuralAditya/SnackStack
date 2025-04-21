import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { 
  CreditCard, 
  Clock, 
  Package, 
  ExternalLink, 
  ChevronRight, 
  User, 
  Edit,
  Loader2
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// Placeholder -  This function needs to be defined elsewhere in your project.
const apiRequest = async (method, url) => {
  const response = await fetch(url, { method });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch order history
  const { 
    data: orders, 
    isLoading: isLoadingOrders 
  } = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiRequest("GET", "/api/orders"),
    enabled: !!user,
  });

  const getUserInitials = () => {
    if (!user) return "";
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
            <Avatar className="h-20 w-20 border-4 border-white shadow-md">
              <AvatarFallback className="bg-primary text-white text-2xl">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-grow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h1>
                  <p className="text-gray-600">{user?.username}</p>
                </div>
                <Button variant="outline" className="sm:self-start">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Point Balance</p>
                    <p className="font-semibold">{user?.points} points</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="font-semibold">{orders?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">Order History</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Summary</CardTitle>
                    <CardDescription>Your account details and preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                        <p>{user?.firstName} {user?.lastName}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Email</h3>
                        <p>{user?.username}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Account Type</h3>
                        <p>{user?.isAdmin ? "Administrator" : "Student"}</p>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Points Summary</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between mb-2">
                            <span>Current Balance</span>
                            <span className="font-semibold">{user?.points} points</span>
                          </div>
                          <div className="flex justify-between mb-2 text-gray-500 text-sm">
                            <span>Last Reload</span>
                            <span>1,000 points on 05/15/2023</span>
                          </div>
                          <Button className="w-full mt-2">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Add Points
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your recent orders and transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingOrders ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : orders && orders.length > 0 ? (
                      <div className="space-y-4">
                        {orders.slice(0, 5).map((order: any) => (
                          <div key={order.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-grow">
                              <div className="flex justify-between">
                                <h4 className="font-medium">Order #{order.id}</h4>
                                <Badge variant={
                                  order.status === 'completed' ? 'success' :
                                  order.status === 'cancelled' ? 'destructive' :
                                  order.status === 'ready' ? 'info' :
                                  'secondary'
                                }>
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">
                                {new Date(order.orderDate).toLocaleDateString()} • {order.totalPoints} points
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        ))}

                        <Button variant="outline" className="w-full" onClick={() => setActiveTab("orders")}>
                          View All Orders
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No orders yet</h3>
                        <p className="text-gray-500 mb-4">
                          You haven't placed any orders yet. Browse the menu to get started.
                        </p>
                        <Button variant="outline" asChild>
                          <a href="/">Browse Menu</a>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Order History</CardTitle>
                  <CardDescription>View all your past orders and their status</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingOrders ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : orders && orders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead>Pickup Time</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((order: any) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">#{order.id}</TableCell>
                              <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                              <TableCell>{order.totalPoints}</TableCell>
                              <TableCell>{order.pickupTime}</TableCell>
                              <TableCell>
                                <OrderProgress status={order.status} />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm">
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">No orders yet</h3>
                      <p className="text-gray-500 mb-4">
                        You haven't placed any orders yet. Browse the menu to get started.
                      </p>
                      <Button variant="outline" asChild>
                        <a href="/">Browse Menu</a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your profile and preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">First Name</label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={user?.firstName}
                            disabled
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">Last Name</label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={user?.lastName}
                            disabled
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">Email</label>
                          <input
                            type="email"
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={user?.username}
                            disabled
                          />
                        </div>
                      </div>
                      <Button className="mt-4" disabled>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Information
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-4">Password</h3>
                      <Button variant="outline" disabled>Change Password</Button>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Order Updates</h4>
                            <p className="text-sm text-gray-500">Get notified when your order status changes</p>
                          </div>
                          <input type="checkbox" className="toggle" defaultChecked disabled />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">New Menu Items</h4>
                            <p className="text-sm text-gray-500">Get notified when new meals are added</p>
                          </div>
                          <input type="checkbox" className="toggle" disabled />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Special Offers</h4>
                            <p className="text-sm text-gray-500">Receive promotional messages and discounts</p>
                          </div>
                          <input type="checkbox" className="toggle" disabled />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 italic mt-4">
                        Notification preferences are coming soon
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}