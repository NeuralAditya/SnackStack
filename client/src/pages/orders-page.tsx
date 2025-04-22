
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: number;
  totalPoints: number;
  status: string;
  createdAt: string;
  items: Array<{
    id: number;
    quantity: number;
    meal: {
      name: string;
      pointCost: number;
    };
  }>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("/api/orders");
        if (!response.ok) throw new Error("Failed to fetch orders");
        const data = await response.json();
        setOrders(data);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load order history"
        });
      }
    };

    fetchOrders();
  }, [toast]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Order History</h1>
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Order #{order.id} - {order.status}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.meal.name} × {item.quantity}</span>
                      <span>{item.meal.pointCost * item.quantity} points</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{order.totalPoints} points</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {orders.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No orders found
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
