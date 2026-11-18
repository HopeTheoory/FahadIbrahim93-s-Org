
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Package, ShoppingBag, PlusCircle, LogOut, Settings, RefreshCw } from 'lucide-react';
import Dashboard from './views/Dashboard';
import CreatePost from './views/CreatePost';
import Inventory from './views/Inventory';
import Orders from './views/Orders';
import Login from './views/Login';
import Profile from './views/Profile';
import { Product, Order, Activity, OrderStatus, Platform, User } from './types';
import { authService } from './services/authService';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'post' | 'inventory' | 'orders' | 'profile'>('dashboard');
  const [loading, setLoading] = useState(true);
  
  // State variables with hydration defaults
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Initialization Logic
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);

      // 1. Check Auth Status
      authService.onAuthUpdate((sessionUser) => {
        if (sessionUser) {
          setUser({
            name: sessionUser.displayName,
            email: sessionUser.email,
            isAuthenticated: true,
            shopName: sessionUser.displayName,
            location: 'Dhaka, Bangladesh',
            avatar: sessionUser.photoURL,
            linkedAccounts: sessionUser.linkedAccounts || {
              facebook: true,
              instagram: true,
              tiktok: false,
              google: true
            },
            notificationSettings: sessionUser.notificationSettings || {
              lowStockAlerts: true,
              lowStockThreshold: 5,
              newOrderAlerts: true,
              marketingEmails: false
            }
          });
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      });

      // 2. Hydrate or Seed Data
      const storedProducts = storageService.getProducts();
      const storedOrders = storageService.getOrders();
      const storedActivities = storageService.getActivities();

      if (storageService.isInitialized() && storedProducts && storedOrders) {
        setProducts(storedProducts);
        setOrders(storedOrders);
        setActivities(storedActivities || []);
      } else {
        // First Time Seeding Logic
        const initialProducts: Product[] = [
          { id: 'p1', name: 'Jamdani Silk Saree', stock: 8, price: 5500, buyingCost: 3200, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=400' },
          { id: 'p2', name: 'Hand-painted Panjabi', stock: 15, price: 2200, buyingCost: 1100, image: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&q=80&w=400' },
          { id: 'p3', name: 'Oxidized Choker Set', stock: 42, price: 850, buyingCost: 350, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=400' },
          { id: 'p4', name: 'Clay Wall Hanging', stock: 5, price: 1200, buyingCost: 500, image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=400' },
          { id: 'p5', name: 'Designer Georgette Hijab', stock: 60, price: 650, buyingCost: 280, image: 'https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?auto=format&fit=crop&q=80&w=400' },
          { id: 'p6', name: 'Block Print Kurti', stock: 12, price: 1800, buyingCost: 950, image: 'https://images.unsplash.com/photo-1609357483233-5a869d622158?auto=format&fit=crop&q=80&w=400' },
          { id: 'p7', name: 'Traditional Clay Pot', stock: 3, price: 450, buyingCost: 150, image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=400' },
          { id: 'p8', name: 'Sandalwood Soap Pack', stock: 25, price: 350, buyingCost: 120, image: 'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?auto=format&fit=crop&q=80&w=400' },
        ];

        const seededOrders = generateHistoricalSeed(initialProducts);
        const initialActivities: Activity[] = [
          { id: 'a1', type: 'order', message: 'ShopEase system initialized successfully', timestamp: 'Day 1' },
          { id: 'a2', type: 'inventory', message: 'Initial product catalog indexed', timestamp: 'Day 1' },
        ];

        setProducts(initialProducts);
        setOrders(seededOrders);
        setActivities(initialActivities);

        storageService.saveProducts(initialProducts);
        storageService.saveOrders(seededOrders);
        storageService.saveActivities(initialActivities);
        storageService.setInitialized();
      }

      setLoading(false);
    };

    initializeData();
  }, []);

  // Automatic Persistence Hooks
  useEffect(() => { if (!loading) storageService.saveProducts(products); }, [products]);
  useEffect(() => { if (!loading) storageService.saveOrders(orders); }, [orders]);
  useEffect(() => { if (!loading) storageService.saveActivities(activities); }, [activities]);

  const generateHistoricalSeed = (catalog: Product[]): Order[] => {
    const data: Order[] = [];
    const platforms = [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.TIKTOK];
    const customers = ['Sara Islam', 'Anik Rahman', 'Nila Ahmed', 'Tarek Aziz', 'Laila Khan', 'Tanvir Ahmed'];
    const today = new Date();
    
    for (let i = 0; i < 85; i++) {
      const dayOffset = Math.floor(Math.random() * 60);
      const orderDate = new Date();
      orderDate.setDate(today.getDate() - dayOffset);
      const product = catalog[Math.floor(Math.random() * catalog.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      
      let status: OrderStatus = OrderStatus.SHIPPED;
      if (dayOffset <= 2) status = Math.random() > 0.5 ? OrderStatus.PENDING : OrderStatus.PAID;
      else if (dayOffset <= 7) status = Math.random() > 0.2 ? OrderStatus.PAID : OrderStatus.SHIPPED;

      data.push({
        id: (3000 + i).toString(),
        platform: platforms[Math.floor(Math.random() * platforms.length)],
        customerName: customers[Math.floor(Math.random() * customers.length)],
        productName: product.name,
        quantity: qty,
        totalPrice: product.price * qty,
        buyingCost: product.buyingCost, // Critical: Anchors cost at time of sale
        status: status,
        date: orderDate.toISOString().split('T')[0]
      });
    }
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleLoginSuccess = (data: any) => {
    const newUser: User = {
      name: data.shopName,
      email: data.email,
      isAuthenticated: true,
      shopName: data.shopName,
      location: data.location,
      avatar: data.avatar,
      linkedAccounts: data.linkedAccounts,
      notificationSettings: {
        lowStockAlerts: true,
        lowStockThreshold: 5,
        newOrderAlerts: true,
        marketingEmails: false
      }
    };
    setUser(newUser);
    setIsAuthenticated(true);
    addActivity(`New login from ${data.providerId || 'Social Auth'}`, 'inventory');
  };

  const handleLogout = async () => {
    await authService.signOut();
    setIsAuthenticated(false);
    setUser(null);
  };

  const addActivity = (message: string, type: Activity['type']) => {
    setActivities(prev => [{ id: Date.now().toString(), type, message, timestamp: 'Just now' }, ...prev].slice(0, 50));
  };

  const updateProductStock = (id: string, delta: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
  };

  const updateOrderStatus = (id: string, newStatus: OrderStatus) => {
    const targetOrder = orders.find(o => o.id === id);
    if (!targetOrder) return;

    if (newStatus === OrderStatus.PAID && targetOrder.status !== OrderStatus.PAID) {
      const product = products.find(p => p.name.toLowerCase() === targetOrder.productName.toLowerCase());
      if (product) updateProductStock(product.id, -targetOrder.quantity);
    }

    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    addActivity(`Order #${id} status: ${newStatus}`, 'order');
  };

  const handleUpdateOrderPrice = (id: string, newPrice: number) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, totalPrice: newPrice } : o));
    addActivity(`Adjusted pricing for order #${id}`, 'order');
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-400 font-black tracking-widest text-[10px] uppercase">Syncing Local Assets...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Login onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <aside className="w-80 bg-white border-r border-slate-100 flex flex-col shadow-sm relative z-20">
        <div className="p-10">
          <h1 className="text-4xl font-black text-blue-600 flex items-center tracking-tighter">
            Shop<span className="text-slate-900">Ease</span>
          </h1>
          <div className="mt-2 flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></div>
            <p className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase">Cloud Persisted</p>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-3">
          <NavItem active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard className="w-5 h-5" />} label="Market Pulse" />
          <NavItem active={currentView === 'post'} onClick={() => setCurrentView('post')} icon={<PlusCircle className="w-5 h-5" />} label="Broadcaster" />
          <NavItem active={currentView === 'inventory'} onClick={() => setCurrentView('inventory')} icon={<Package className="w-5 h-5" />} label="Warehouse" />
          <NavItem active={currentView === 'orders'} onClick={() => setCurrentView('orders')} icon={<ShoppingBag className="w-5 h-5" />} label="Orders" />
          <div className="pt-6 mt-6 border-t border-slate-50">
             <NavItem active={currentView === 'profile'} onClick={() => setCurrentView('profile')} icon={<Settings className="w-5 h-5" />} label="Settings" />
          </div>
        </nav>

        <div className="p-8">
          <div className="p-5 mb-4 rounded-[32px] bg-slate-50 border border-slate-100 flex items-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-100 overflow-hidden">
              {user?.avatar ? <img src={user.avatar} alt={user.shopName || 'Shop avatar'} className="w-full h-full object-cover" /> : user?.shopName?.charAt(0) || 'S'}
            </div>
            <div className="ml-4 overflow-hidden">
              <p className="text-sm font-black text-slate-900 truncate">{user?.shopName || 'My Shop'}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Store Admin</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center w-full px-5 py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-black text-xs uppercase tracking-widest group">
            <LogOut className="mr-3 w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Sign Out Securely
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          {currentView === 'dashboard' && <Dashboard products={products} orders={orders} activities={activities} onNavigate={setCurrentView} user={user} />}
          {currentView === 'post' && <CreatePost onPostSuccess={() => { addActivity('Campaign Broadcast Active', 'post'); setCurrentView('dashboard'); }} shopName={user?.shopName} />}
          {currentView === 'inventory' && <Inventory products={products} setProducts={setProducts} onActivity={addActivity} />}
          {currentView === 'orders' && <Orders orders={orders} onUpdateStatus={updateOrderStatus} onUpdatePrice={handleUpdateOrderPrice} />}
          {currentView === 'profile' && <Profile user={user} onUpdateUser={(updated) => { setUser(updated); addActivity('Store profile updated', 'inventory'); }} />}
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center w-full px-6 py-5 text-left rounded-[24px] transition-all group ${active ? 'bg-slate-900 text-white shadow-2xl shadow-slate-200 translate-x-1' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}>
    <div className={`mr-4 transition-colors ${active ? 'text-blue-400' : 'text-slate-300 group-hover:text-blue-600'}`}>{icon}</div>
    <span className={`font-black text-xs uppercase tracking-[0.2em] ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
  </button>
);

export default App;
