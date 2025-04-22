import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertOrderSchema, insertCartItemSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Check if user is authenticated
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Check if user is admin
  const isAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  // Get all meals
  app.get("/api/meals", async (req, res) => {
    try {
      const meals = await storage.getMeals();
      res.json(meals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });

  // Get a single meal by ID
  app.get("/api/meals/:id", async (req, res) => {
    try {
      const mealId = parseInt(req.params.id);
      const meal = await storage.getMealById(mealId);

      if (!meal) {
        return res.status(404).json({ message: "Meal not found" });
      }

      res.json(meal);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meal" });
    }
  });

  // Get meals by category
  app.get("/api/meals/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const meals = await storage.getMealsByCategory(category);
      res.json(meals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meals by category" });
    }
  });

  // Create a new meal (admin only)
  app.post("/api/meals", isAdmin, async (req, res) => {
    try {
      const meal = await storage.createMeal(req.body);
      res.status(201).json(meal);
    } catch (error) {
      res.status(500).json({ message: "Failed to create meal" });
    }
  });

  // Update a meal (admin only)
  app.put("/api/meals/:id", isAdmin, async (req, res) => {
    try {
      const mealId = parseInt(req.params.id);
      const { id, ...mealData } = req.body; // Remove id from update data
      const meal = await storage.updateMeal(mealId, mealData);
      if (!meal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      res.json(meal);
    } catch (error) {
      res.status(500).json({ message: "Failed to update meal" });
    }
  });

  // Delete a meal (admin only)
  app.delete("/api/meals/:id", isAdmin, async (req, res) => {
    try {
      const mealId = parseInt(req.params.id);
      const result = await storage.deleteMeal(mealId);

      if (!result) {
        return res.status(404).json({ message: "Meal not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete meal" });
    }
  });

  // Get the user's cart
  app.get("/api/cart", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const cart = await storage.getCart(userId);

      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  // Add an item to the cart
  app.post("/api/cart/items", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { mealId, quantity } = req.body;

      const schema = z.object({
        mealId: z.number(),
        quantity: z.number().min(1).max(10)
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const cartItem = await storage.addToCart(userId, mealId, quantity);
      res.status(201).json(cartItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to add to cart" });
    }
  });

  // Update a cart item
  app.put("/api/cart/items/:id", isAuthenticated, async (req, res) => {
    try {
      const cartItemId = parseInt(req.params.id);
      const { quantity } = req.body;

      const schema = z.object({
        quantity: z.number().min(1).max(10)
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      const cartItem = await storage.updateCartItem(cartItemId, quantity);
      res.json(cartItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  // Remove an item from the cart
  app.delete("/api/cart/items/:id", isAuthenticated, async (req, res) => {
    try {
      const cartItemId = parseInt(req.params.id);
      const result = await storage.removeFromCart(cartItemId);

      if (!result) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  // Clear the cart
  app.delete("/api/cart", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      await storage.clearCart(userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Create a new order from the cart
  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { pickupTime, specialInstructions } = req.body;

      // Get the user's cart
      const cart = await storage.getCart(userId);
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // Calculate total points
      const totalPoints = cart.items.reduce(
        (sum, item) => sum + (item.meal.pointCost * item.quantity),
        0
      );

      // Check if user has enough points
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.points < totalPoints) {
        return res.status(400).json({ message: "Not enough points" });
      }

      // Create the order
      const orderData = {
        userId,
        totalPoints,
        pickupTime,
        specialInstructions,
        status: "pending"
      };

      const orderSchema = insertOrderSchema.safeParse(orderData);
      if (!orderSchema.success) {
        return res.status(400).json({ message: "Invalid order data" });
      }

      const order = await storage.createOrder(orderData, cart.items);
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Get user's orders
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const orders = await storage.getUserOrders(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get all orders (admin only)
  app.get("/api/admin/orders", isAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all orders" });
    }
  });

  // Get all users (admin only)
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get a single order
  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if the user is authorized to view this order
      if (order.userId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Get order items for an order
  app.get("/api/orders/:id/items", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if the user is authorized to view this order
      if (order.userId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const items = await storage.getOrderItems(orderId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });

  // Update order status (admin only)
  app.put("/api/orders/:id/status", isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;

      if (!["pending", "preparing", "ready", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const order = await storage.updateOrderStatus(orderId, status);
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}