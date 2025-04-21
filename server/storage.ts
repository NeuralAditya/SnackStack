import { 
  User, InsertUser, Meal, InsertMeal, Order, InsertOrder, 
  OrderItem, InsertOrderItem, Cart, InsertCart, CartItem, InsertCartItem 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: number, points: number): Promise<User>;
  
  // Meal methods
  getMeals(): Promise<Meal[]>;
  getMealById(id: number): Promise<Meal | undefined>;
  getMealsByCategory(category: string): Promise<Meal[]>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  updateMeal(id: number, meal: Partial<InsertMeal>): Promise<Meal>;
  deleteMeal(id: number): Promise<boolean>;
  
  // Cart methods
  getCart(userId: number): Promise<{ cart: Cart, items: (CartItem & { meal: Meal })[] } | undefined>;
  addToCart(userId: number, mealId: number, quantity: number): Promise<CartItem>;
  updateCartItem(cartItemId: number, quantity: number): Promise<CartItem>;
  removeFromCart(cartItemId: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;
  
  // Order methods
  createOrder(order: InsertOrder, cartItems: CartItem[]): Promise<Order>;
  getOrderById(id: number): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(orderId: number, status: string): Promise<Order>;
  getOrderItems(orderId: number): Promise<(OrderItem & { meal: Meal })[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private meals: Map<number, Meal>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private carts: Map<number, Cart>;
  private cartItems: Map<number, CartItem>;
  
  private userIdCounter: number;
  private mealIdCounter: number;
  private orderIdCounter: number;
  private orderItemIdCounter: number;
  private cartIdCounter: number;
  private cartItemIdCounter: number;
  
  sessionStore: session.SessionStore;
  
  constructor() {
    this.users = new Map();
    this.meals = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.carts = new Map();
    this.cartItems = new Map();
    
    this.userIdCounter = 1;
    this.mealIdCounter = 1;
    this.orderIdCounter = 1;
    this.orderItemIdCounter = 1;
    this.cartIdCounter = 1;
    this.cartItemIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Initialize with sample meals
    this.initializeSampleData();
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { id, ...userData };
    this.users.set(id, user);
    
    // Create an empty cart for the user
    await this.createCart(id);
    
    return user;
  }
  
  async updateUserPoints(userId: number, points: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    user.points = points;
    this.users.set(userId, user);
    
    return user;
  }
  
  // Meal methods
  async getMeals(): Promise<Meal[]> {
    return Array.from(this.meals.values());
  }
  
  async getMealById(id: number): Promise<Meal | undefined> {
    return this.meals.get(id);
  }
  
  async getMealsByCategory(category: string): Promise<Meal[]> {
    return Array.from(this.meals.values()).filter(
      (meal) => meal.category === category
    );
  }
  
  async createMeal(mealData: InsertMeal): Promise<Meal> {
    const id = this.mealIdCounter++;
    const meal: Meal = { id, ...mealData };
    this.meals.set(id, meal);
    return meal;
  }
  
  async updateMeal(id: number, mealData: Partial<InsertMeal>): Promise<Meal> {
    const meal = await this.getMealById(id);
    if (!meal) throw new Error("Meal not found");
    
    const updatedMeal = { ...meal, ...mealData };
    this.meals.set(id, updatedMeal);
    
    return updatedMeal;
  }
  
  async deleteMeal(id: number): Promise<boolean> {
    return this.meals.delete(id);
  }
  
  // Cart methods
  private async createCart(userId: number): Promise<Cart> {
    const id = this.cartIdCounter++;
    const cart: Cart = { id, userId };
    this.carts.set(id, cart);
    return cart;
  }
  
  private async getUserCart(userId: number): Promise<Cart> {
    const cart = Array.from(this.carts.values()).find(
      (cart) => cart.userId === userId
    );
    
    if (!cart) {
      return this.createCart(userId);
    }
    
    return cart;
  }
  
  async getCart(userId: number): Promise<{ cart: Cart; items: (CartItem & { meal: Meal })[] } | undefined> {
    const cart = await this.getUserCart(userId);
    
    const cartItems = Array.from(this.cartItems.values())
      .filter((item) => item.cartId === cart.id)
      .map((item) => {
        const meal = this.meals.get(item.mealId);
        if (!meal) throw new Error(`Meal not found for cart item: ${item.id}`);
        return { ...item, meal };
      });
    
    return { cart, items: cartItems };
  }
  
  async addToCart(userId: number, mealId: number, quantity: number): Promise<CartItem> {
    const cart = await this.getUserCart(userId);
    const meal = await this.getMealById(mealId);
    
    if (!meal) throw new Error("Meal not found");
    
    // Check if item already exists in cart
    const existingItem = Array.from(this.cartItems.values()).find(
      (item) => item.cartId === cart.id && item.mealId === mealId
    );
    
    if (existingItem) {
      // Update quantity if already exists
      existingItem.quantity += quantity;
      this.cartItems.set(existingItem.id, existingItem);
      return existingItem;
    }
    
    // Create new cart item
    const id = this.cartItemIdCounter++;
    const cartItem: CartItem = {
      id,
      cartId: cart.id,
      mealId,
      quantity
    };
    
    this.cartItems.set(id, cartItem);
    return cartItem;
  }
  
  async updateCartItem(cartItemId: number, quantity: number): Promise<CartItem> {
    const cartItem = this.cartItems.get(cartItemId);
    if (!cartItem) throw new Error("Cart item not found");
    
    cartItem.quantity = quantity;
    this.cartItems.set(cartItemId, cartItem);
    
    return cartItem;
  }
  
  async removeFromCart(cartItemId: number): Promise<boolean> {
    return this.cartItems.delete(cartItemId);
  }
  
  async clearCart(userId: number): Promise<boolean> {
    const cart = await this.getUserCart(userId);
    
    // Find all cart items for this cart
    const itemsToRemove = Array.from(this.cartItems.values())
      .filter((item) => item.cartId === cart.id)
      .map((item) => item.id);
    
    // Delete each cart item
    itemsToRemove.forEach((id) => this.cartItems.delete(id));
    
    return true;
  }
  
  // Order methods
  async createOrder(orderData: InsertOrder, items: CartItem[]): Promise<Order> {
    // Create the order
    const id = this.orderIdCounter++;
    const order: Order = { id, ...orderData };
    this.orders.set(id, order);
    
    // Create order items from cart items
    for (const item of items) {
      const meal = await this.getMealById(item.mealId);
      if (!meal) throw new Error("Meal not found");
      
      const orderItemId = this.orderItemIdCounter++;
      const orderItem: OrderItem = {
        id: orderItemId,
        orderId: id,
        mealId: item.mealId,
        quantity: item.quantity,
        pointCost: meal.pointCost
      };
      
      this.orderItems.set(orderItemId, orderItem);
    }
    
    // Reduce user points
    const user = await this.getUser(orderData.userId);
    if (!user) throw new Error("User not found");
    
    user.points -= orderData.totalPoints;
    this.users.set(user.id, user);
    
    // Clear the user's cart
    await this.clearCart(orderData.userId);
    
    return order;
  }
  
  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }
  
  async getUserOrders(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter((order) => order.userId === userId)
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }
  
  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values())
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }
  
  async updateOrderStatus(orderId: number, status: string): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error("Order not found");
    
    order.status = status;
    this.orders.set(orderId, order);
    
    return order;
  }
  
  async getOrderItems(orderId: number): Promise<(OrderItem & { meal: Meal })[]> {
    const items = Array.from(this.orderItems.values())
      .filter((item) => item.orderId === orderId)
      .map((item) => {
        const meal = this.meals.get(item.mealId);
        if (!meal) throw new Error(`Meal not found for order item: ${item.id}`);
        return { ...item, meal };
      });
    
    return items;
  }
  
  // Initialize sample data
  private async initializeSampleData() {
    // Create admin user
    const adminUser: InsertUser = {
      username: "admin@campus.edu",
      password: "$2b$10$RKUIiHmjxSoVrGgAYny3DO.njIqM4P3IwWJb9ACbcKlHSvs2FoLG6", // password: admin123
      firstName: "Admin",
      lastName: "User",
      isAdmin: true
    };
    await this.createUser(adminUser);
    
    // Sample meals
    const meals: InsertMeal[] = [
      {
        name: "Healthy Salad Bowl",
        description: "Fresh garden salad with avocado, quinoa, and citrus dressing",
        imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        pointCost: 120,
        category: "Lunch",
        tags: ["Vegetarian", "Healthy", "Salad"],
        restaurantName: "Green Café",
        prepTime: "15-20 min",
        nutritionInfo: { calories: 320, protein: 12, carbs: 45, fat: 10 },
        allergens: ["Nuts"],
        isAvailable: true
      },
      {
        name: "Grilled Chicken Sandwich",
        description: "Grilled chicken breast with avocado, bacon, and house aioli",
        imageUrl: "https://images.unsplash.com/photo-1560035285-64808ba47bda?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        pointCost: 200,
        category: "Lunch",
        tags: ["Popular", "Sandwich"],
        restaurantName: "Campus Grill",
        prepTime: "10-15 min",
        nutritionInfo: { calories: 480, protein: 28, carbs: 42, fat: 24 },
        allergens: ["Gluten", "Eggs", "Milk"],
        isAvailable: true
      },
      {
        name: "Breakfast Burrito",
        description: "Scrambled eggs, black beans, cheese, and salsa in a flour tortilla",
        imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        pointCost: 150,
        category: "Breakfast",
        tags: ["Breakfast", "Mexican"],
        restaurantName: "Morning Stop",
        prepTime: "5-10 min",
        nutritionInfo: { calories: 400, protein: 18, carbs: 45, fat: 18 },
        allergens: ["Gluten", "Milk", "Eggs"],
        isAvailable: true
      },
      {
        name: "Margherita Pizza",
        description: "Traditional pizza with tomato sauce, fresh mozzarella, and basil",
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        pointCost: 180,
        category: "Dinner",
        tags: ["Italian", "Pizza"],
        restaurantName: "Pizza Corner",
        prepTime: "20-25 min",
        nutritionInfo: { calories: 520, protein: 22, carbs: 60, fat: 26 },
        allergens: ["Gluten", "Milk"],
        isAvailable: true
      },
      {
        name: "Smoothie Bowl",
        description: "Açaí and mixed berry smoothie topped with granola and fresh fruit",
        imageUrl: "https://images.unsplash.com/photo-1525268771113-32d9e9021a97?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        pointCost: 140,
        category: "Breakfast",
        tags: ["Vegan", "Healthy"],
        restaurantName: "Juice Bar",
        prepTime: "10 min",
        nutritionInfo: { calories: 340, protein: 8, carbs: 72, fat: 5 },
        allergens: ["Nuts"],
        isAvailable: true
      },
      {
        name: "Teriyaki Bowl",
        description: "Grilled chicken, steamed vegetables, and teriyaki sauce over rice",
        imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        pointCost: 210,
        category: "Dinner",
        tags: ["Asian", "Bowl"],
        restaurantName: "Asian Fusion",
        prepTime: "15 min",
        nutritionInfo: { calories: 450, protein: 30, carbs: 58, fat: 12 },
        allergens: ["Soy", "Sesame"],
        isAvailable: true
      },
      {
        name: "Mac and Cheese",
        description: "Creamy mac and cheese with breadcrumb topping and truffle oil",
        imageUrl: "https://images.unsplash.com/photo-1619096252214-ef06c45683e3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        pointCost: 160,
        category: "Dinner",
        tags: ["Comfort Food", "Vegetarian"],
        restaurantName: "Comfort Kitchen",
        prepTime: "15 min",
        nutritionInfo: { calories: 580, protein: 22, carbs: 55, fat: 32 },
        allergens: ["Milk", "Gluten"],
        isAvailable: true
      },
      {
        name: "Fruit Parfait",
        description: "Greek yogurt with seasonal fruit, honey and homemade granola",
        imageUrl: "https://images.unsplash.com/photo-1553451166-232112bda6f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        pointCost: 100,
        category: "Breakfast",
        tags: ["Vegetarian", "Healthy"],
        restaurantName: "Morning Stop",
        prepTime: "5 min",
        nutritionInfo: { calories: 280, protein: 14, carbs: 38, fat: 8 },
        allergens: ["Milk", "Nuts"],
        isAvailable: true
      }
    ];
    
    for (const meal of meals) {
      await this.createMeal(meal);
    }
  }
}

export const storage = new MemStorage();
