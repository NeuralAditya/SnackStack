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
    const user: User = { 
      id, 
      ...userData,
      isAdmin: userData.isAdmin || false,
      points: userData.points || 500 // Default points for new users
    };
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
      password: "9f06c79c862870a7d5c299e77fcfc5667e3733f788cf092dccc1cfc94a72ba19990ba47fc43bb457dcb80038e64d22860c776dfc95e0d8f3a17c7bc8b80a26c9.69ae10b0cccb84808e7b35eefa9cc106", // password: admin123
      firstName: "Admin",
      lastName: "User",
      isAdmin: true,
      points: 1000
    };
    await this.createUser(adminUser);
    
    // Sample meals
    const meals: InsertMeal[] = [
      {
        name: "Paneer Tikka Bowl",
        description: "Grilled paneer cubes with bell peppers, onions, mint chutney over brown rice",
        imageUrl: "https://naturallynidhi.com/wp-content/uploads/2020/04/TandooriPaneerBowl_Cover.jpg",
        pointCost: 150,
        category: "Lunch",
        tags: ["Vegetarian","Gluten-Free", "Popular"],
        restaurantName: "Tandoori Express",
        prepTime: "10-15 min",
        nutritionInfo: { calories: 410, protein: 22, carbs: 35, fat: 18 },
        allergens: ["Milk"],
        isAvailable: true
      },
      {
        name: "Rajma Chawal Bowl",
        description: "Kidney beans cooked in a tomato-based curry served with brown basmati rice",
        imageUrl: "https://images.news18.com/webstories/uploads/2024/11/Screenshot-2024-11-15-at-11.13.15-PM-2024-11-d263b8d75f70dc81e4774f7721852dd4.png",
        pointCost: 100,
        category: "Lunch",
        tags: ["Popular","Gluten-Free", "Student Favorite"],
        restaurantName: "Spice Junction",
        prepTime: "10-15 min",
        nutritionInfo: { calories: 390, protein: 14, carbs: 55, fat: 10 },
        allergens: ["None"],
        isAvailable: true
      },
      {
        name: "Chole Quinoa Bowl",
        description: "Scrambled eggs, black beans, cheese, and salsa in a flour tortilla",
        imageUrl: "https://vegecravings.com/wp-content/uploads/2024/09/Quinoa-Chickpea-Salad-Recipe-Step-By-Step-Instructions-scaled.jpg.webp",
        pointCost: 150,
        category: "Breakfast",
        tags: ["Salad", "High Protein","Gluten-Free"],
        restaurantName: "Curry Bowl Co.",
        prepTime: "10 min",
        nutritionInfo: { calories: 430, protein: 20, carbs: 44, fat: 14 },
        allergens: ["None"],
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
        name: "Tofu Bhurji Wrap",
        description: "Scrambled tofu with Indian spices in a whole wheat wrap",
        imageUrl: "https://cookingforpeanuts.com/wp-content/uploads/2022/07/Vegan-High-Protein-Tofu-Scramble-Breakfast-Burritos.jpg",
        pointCost: 140,
        category: "Breakfast",
        tags: ["Vegan", "Healthy"],
        restaurantName: "Urban Dabba",
        prepTime: "10 min",
        nutritionInfo: { calories: 360, protein: 18, carbs: 38, fat: 14 },
        allergens: ["Gluten"],
        isAvailable: true
      },
      {
        name: "Palak Paneer Bowl",
        description: "Spinach curry with paneer cubes served over millet",
        imageUrl: "https://ministryofcurry.com/wp-content/uploads/2017/04/Instant-Pot-Palak-Paneer-SQ.jpg",
        pointCost: 160,
        category: "Dinner",
        tags: ["Indian Style", "Bowl"],
        restaurantName: "The Green Bowl",
        prepTime: "15-20 min",
        nutritionInfo: { calories: 450, protein: 22, carbs: 30, fat: 20 },
        allergens: ["Milk"],
        isAvailable: true
      },
      {
        name: "Curd Rice Bowl",
        description: "Creamy yogurt rice tempered with mustard seeds, curry leaves & ginger",
        imageUrl: "https://thespicerackatlanta.com/wp-content/uploads/2021/09/curd-rice.jpg",
        pointCost: 120,
        category: "Dinner",
        tags: ["Comfort Food", "Vegetarian", "Cool & Soothing"],
        restaurantName: "Southern Spoon",
        prepTime: "10 min",
        nutritionInfo: { calories: 340, protein: 9, carbs: 38, fat: 14 },
        allergens: ["Milk"],
        isAvailable: true
      },
      {
        name: "Vegetable Upma",
        description: "Semolina porridge with sautéed veggies and mustard seeds",
        imageUrl: "https://www.archanaskitchen.com//images/archanaskitchen/1-Author/Jyothi_Rajesh/Vegetable_Rice_Upma.jpg",
        pointCost: 100,
        category: "Breakfast",
        tags: ["Vegetarian", "Healthy"],
        restaurantName: "Morning Stop",
        prepTime: "5 min",
        nutritionInfo: { calories: 320, protein: 8, carbs: 42, fat: 10 },
        allergens: ["Gluten"],
        isAvailable: true
      }
    ];
    
    for (const meal of meals) {
      await this.createMeal(meal);
    }
  }
}

export const storage = new MemStorage();
