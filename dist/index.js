// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import session from "express-session";
import createMemoryStore from "memorystore";
var MemoryStore = createMemoryStore(session);
var MemStorage = class {
  users;
  meals;
  orders;
  orderItems;
  carts;
  cartItems;
  userIdCounter;
  mealIdCounter;
  orderIdCounter;
  orderItemIdCounter;
  cartIdCounter;
  cartItemIdCounter;
  sessionStore;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.meals = /* @__PURE__ */ new Map();
    this.orders = /* @__PURE__ */ new Map();
    this.orderItems = /* @__PURE__ */ new Map();
    this.carts = /* @__PURE__ */ new Map();
    this.cartItems = /* @__PURE__ */ new Map();
    this.userIdCounter = 1;
    this.mealIdCounter = 1;
    this.orderIdCounter = 1;
    this.orderItemIdCounter = 1;
    this.cartIdCounter = 1;
    this.cartItemIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // 24 hours
    });
    this.initializeSampleData();
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(userData) {
    const id = this.userIdCounter++;
    const user = {
      id,
      ...userData,
      isAdmin: userData.isAdmin || false,
      points: userData.points || 500
      // Default points for new users
    };
    this.users.set(id, user);
    await this.createCart(id);
    return user;
  }
  async updateUserPoints(userId, points) {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    user.points = points;
    this.users.set(userId, user);
    return user;
  }
  // Meal methods
  async getMeals() {
    return Array.from(this.meals.values());
  }
  async getMealById(id) {
    return this.meals.get(id);
  }
  async getMealsByCategory(category) {
    return Array.from(this.meals.values()).filter(
      (meal) => meal.category === category
    );
  }
  async createMeal(mealData) {
    const id = this.mealIdCounter++;
    const meal = { id, ...mealData };
    this.meals.set(id, meal);
    return meal;
  }
  async updateMeal(id, mealData) {
    const meal = await this.getMealById(id);
    if (!meal) throw new Error("Meal not found");
    const updatedMeal = { ...meal, ...mealData };
    this.meals.set(id, updatedMeal);
    return updatedMeal;
  }
  async deleteMeal(id) {
    return this.meals.delete(id);
  }
  // Cart methods
  async createCart(userId) {
    const id = this.cartIdCounter++;
    const cart = { id, userId };
    this.carts.set(id, cart);
    return cart;
  }
  async getUserCart(userId) {
    const cart = Array.from(this.carts.values()).find(
      (cart2) => cart2.userId === userId
    );
    if (!cart) {
      return this.createCart(userId);
    }
    return cart;
  }
  async getCart(userId) {
    const cart = await this.getUserCart(userId);
    const cartItems2 = Array.from(this.cartItems.values()).filter((item) => item.cartId === cart.id).map((item) => {
      const meal = this.meals.get(item.mealId);
      if (!meal) throw new Error(`Meal not found for cart item: ${item.id}`);
      return { ...item, meal };
    });
    return { cart, items: cartItems2 };
  }
  async addToCart(userId, mealId, quantity) {
    const cart = await this.getUserCart(userId);
    const meal = await this.getMealById(mealId);
    if (!meal) throw new Error("Meal not found");
    const existingItem = Array.from(this.cartItems.values()).find(
      (item) => item.cartId === cart.id && item.mealId === mealId
    );
    if (existingItem) {
      existingItem.quantity += quantity;
      this.cartItems.set(existingItem.id, existingItem);
      return existingItem;
    }
    const id = this.cartItemIdCounter++;
    const cartItem = {
      id,
      cartId: cart.id,
      mealId,
      quantity
    };
    this.cartItems.set(id, cartItem);
    return cartItem;
  }
  async updateCartItem(cartItemId, quantity) {
    const cartItem = this.cartItems.get(cartItemId);
    if (!cartItem) throw new Error("Cart item not found");
    cartItem.quantity = quantity;
    this.cartItems.set(cartItemId, cartItem);
    return cartItem;
  }
  async removeFromCart(cartItemId) {
    return this.cartItems.delete(cartItemId);
  }
  async clearCart(userId) {
    const cart = await this.getUserCart(userId);
    const itemsToRemove = Array.from(this.cartItems.values()).filter((item) => item.cartId === cart.id).map((item) => item.id);
    itemsToRemove.forEach((id) => this.cartItems.delete(id));
    return true;
  }
  // Order methods
  async createOrder(orderData, items) {
    const id = this.orderIdCounter++;
    const order = { id, ...orderData };
    this.orders.set(id, order);
    for (const item of items) {
      const meal = await this.getMealById(item.mealId);
      if (!meal) throw new Error("Meal not found");
      const orderItemId = this.orderItemIdCounter++;
      const orderItem = {
        id: orderItemId,
        orderId: id,
        mealId: item.mealId,
        quantity: item.quantity,
        pointCost: meal.pointCost
      };
      this.orderItems.set(orderItemId, orderItem);
    }
    const user = await this.getUser(orderData.userId);
    if (!user) throw new Error("User not found");
    user.points -= orderData.totalPoints;
    this.users.set(user.id, user);
    await this.clearCart(orderData.userId);
    return order;
  }
  async getOrderById(id) {
    return this.orders.get(id);
  }
  async getUserOrders(userId) {
    return Array.from(this.orders.values()).filter((order) => order.userId === userId).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }
  async getAllOrders() {
    return Array.from(this.orders.values()).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }
  async updateOrderStatus(orderId, status) {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error("Order not found");
    order.status = status;
    this.orders.set(orderId, order);
    return order;
  }
  async getOrderItems(orderId) {
    const items = Array.from(this.orderItems.values()).filter((item) => item.orderId === orderId).map((item) => {
      const meal = this.meals.get(item.mealId);
      if (!meal) throw new Error(`Meal not found for order item: ${item.id}`);
      return { ...item, meal };
    });
    return items;
  }
  // Initialize sample data
  async initializeSampleData() {
    const adminUser = {
      username: "admin@campus.edu",
      password: "9f06c79c862870a7d5c299e77fcfc5667e3733f788cf092dccc1cfc94a72ba19990ba47fc43bb457dcb80038e64d22860c776dfc95e0d8f3a17c7bc8b80a26c9.69ae10b0cccb84808e7b35eefa9cc106",
      // password: admin123
      firstName: "Admin",
      lastName: "User",
      isAdmin: true,
      points: 1e3
    };
    await this.createUser(adminUser);
    const meals2 = [
      {
        name: "Paneer Tikka Bowl",
        description: "Grilled paneer cubes with bell peppers, onions, mint chutney over brown rice",
        imageUrl: "https://naturallynidhi.com/wp-content/uploads/2020/04/TandooriPaneerBowl_Cover.jpg",
        pointCost: 150,
        category: "Lunch",
        tags: ["Vegetarian", "Gluten-Free", "Popular"],
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
        tags: ["Popular", "Gluten-Free", "Student Favorite"],
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
        tags: ["Salad", "High Protein", "Gluten-Free"],
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
        description: "Semolina porridge with saut\xE9ed veggies and mustard seeds",
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
    for (const meal of meals2) {
      await this.createMeal(meal);
    }
  }
};
var storage = new MemStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "snackstack-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      req.login(user, (err2) => {
        if (err2) return next(err2);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// server/routes.ts
import { z } from "zod";

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  points: integer("points").notNull().default(1e3)
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  isAdmin: true,
  points: true
});
var meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  pointCost: integer("point_cost").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array(),
  restaurantName: text("restaurant_name").notNull(),
  prepTime: text("prep_time").notNull(),
  nutritionInfo: json("nutrition_info"),
  allergens: text("allergens").array(),
  isAvailable: boolean("is_available").notNull().default(true)
});
var insertMealSchema = createInsertSchema(meals).omit({
  id: true
});
var orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  orderDate: timestamp("order_date").notNull().defaultNow(),
  status: text("status").notNull().default("pending"),
  totalPoints: integer("total_points").notNull(),
  pickupTime: text("pickup_time").notNull(),
  specialInstructions: text("special_instructions")
});
var insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderDate: true
});
var orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  mealId: integer("meal_id").notNull(),
  quantity: integer("quantity").notNull(),
  pointCost: integer("point_cost").notNull()
});
var insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true
});
var carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique()
});
var insertCartSchema = createInsertSchema(carts).omit({
  id: true
});
var cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").notNull(),
  mealId: integer("meal_id").notNull(),
  quantity: integer("quantity").notNull()
});
var insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true
});

// server/routes.ts
async function registerRoutes(app2) {
  setupAuth(app2);
  const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };
  const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };
  app2.get("/api/meals", async (req, res) => {
    try {
      const meals2 = await storage.getMeals();
      res.json(meals2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });
  app2.get("/api/meals/:id", async (req, res) => {
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
  app2.get("/api/meals/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const meals2 = await storage.getMealsByCategory(category);
      res.json(meals2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meals by category" });
    }
  });
  app2.post("/api/meals", isAdmin, async (req, res) => {
    try {
      const meal = await storage.createMeal(req.body);
      res.status(201).json(meal);
    } catch (error) {
      res.status(500).json({ message: "Failed to create meal" });
    }
  });
  app2.put("/api/meals/:id", isAdmin, async (req, res) => {
    try {
      const mealId = parseInt(req.params.id);
      const { id, ...mealData } = req.body;
      const meal = await storage.updateMeal(mealId, mealData);
      if (!meal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      res.json(meal);
    } catch (error) {
      res.status(500).json({ message: "Failed to update meal" });
    }
  });
  app2.delete("/api/meals/:id", isAdmin, async (req, res) => {
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
  app2.get("/api/cart", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const cart = await storage.getCart(userId);
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }
      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });
  app2.post("/api/cart/items", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
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
  app2.put("/api/cart/items/:id", isAuthenticated, async (req, res) => {
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
  app2.delete("/api/cart/items/:id", isAuthenticated, async (req, res) => {
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
  app2.delete("/api/cart", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      await storage.clearCart(userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });
  app2.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { pickupTime, specialInstructions } = req.body;
      const cart = await storage.getCart(userId);
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      const totalPoints = cart.items.reduce(
        (sum, item) => sum + item.meal.pointCost * item.quantity,
        0
      );
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.points < totalPoints) {
        return res.status(400).json({ message: "Not enough points" });
      }
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
  app2.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const orders2 = await storage.getUserOrders(userId);
      res.json(orders2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });
  app2.get("/api/admin/orders", isAdmin, async (req, res) => {
    try {
      const orders2 = await storage.getAllOrders();
      res.json(orders2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all orders" });
    }
  });
  app2.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });
  app2.get("/api/orders/:id/items", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const items = await storage.getOrderItems(orderId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });
  app2.put("/api/orders/:id/status", isAdmin, async (req, res) => {
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import dotenv from "dotenv";
dotenv.config();
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  console.log("\u{1F680} Bootstrapping server...");
  const server = await registerRoutes(app);
  console.log("\u2705 Routes registered");
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
    console.log("\u{1F527} Vite dev server setup done.");
  } else {
    serveStatic(app);
    console.log("\u{1F4E6} Serving static build.");
  }
  const port = 5e3;
  server.listen({
    port,
    host: "127.0.0.1"
  }, () => {
    log(`\u2705 Server is listening at http://127.0.0.1:${port}`);
  });
})();
