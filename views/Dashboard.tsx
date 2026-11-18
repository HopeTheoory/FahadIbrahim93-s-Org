
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, AlertCircle, ShoppingCart, DollarSign, ArrowRight, Share2, ClipboardList, Zap, Globe, ShieldCheck, Sparkles, TrendingUp, Lightbulb, ChevronRight, Loader2, Landmark, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Product, Order, Activity, User, AIStrategicInsight } from '../types';
import { getStrategicInsights } from '../services/geminiService';

interface DashboardProps {
  products: Product[];
  orders: Order[];
  activities: Activity[];
  onNavigate: (view: any) => void;
  user: User | null;
}

interface DailySalesPoint {
  date: string;
  label: string;
  revenue: number;
  profit: number;
  orderCount: number;
}

interface TopProductPoint {
  name: string;
  shortName: string;
  units: number;
  revenue: number;
}

const formatCompactBdt = (value: number): string => {
  if (value >= 100000) return `৳${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `৳${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return `৳${value}`;
};

const Dashboard: React.FC<DashboardProps> = ({ products, orders, activities, onNavigate, user }) => {
  const [insights, setInsights] = useState<AIStrategicInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [salesRange, setSalesRange] = useState<7 | 30 | 60>(30);
  const lastUpdateRef = useRef<{ pCount: number, oCount: number }>({ pCount: 0, oCount: 0 });

  const lowStockCount = products.filter(p => p.stock < 5).length;
  const todayOrders = orders.filter(o => o.date === new Date().toISOString().split('T')[0]).length;
  
  // Financial metrics
  const revenue = orders.reduce((acc, o) => acc + o.totalPrice, 0);
  const totalCost = orders.reduce((acc, o) => acc + (o.buyingCost * o.quantity), 0);
  const netProfit = revenue - totalCost;

  // Daily sales trends aggregated over the selected timeframe
  const dailySalesData = useMemo<DailySalesPoint[]>(() => {
    const totalsByDate = new Map<string, { revenue: number; profit: number; orderCount: number }>();
    for (const order of orders) {
      const existing = totalsByDate.get(order.date) || { revenue: 0, profit: 0, orderCount: 0 };
      const orderProfit = order.totalPrice - order.buyingCost * order.quantity;
      existing.revenue += order.totalPrice;
      existing.profit += orderProfit;
      existing.orderCount += 1;
      totalsByDate.set(order.date, existing);
    }

    const points: DailySalesPoint[] = [];
    const today = new Date();
    for (let offset = salesRange - 1; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const isoDate = d.toISOString().split('T')[0];
      const entry = totalsByDate.get(isoDate) || { revenue: 0, profit: 0, orderCount: 0 };
      points.push({
        date: isoDate,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: entry.revenue,
        profit: entry.profit,
        orderCount: entry.orderCount,
      });
    }
    return points;
  }, [orders, salesRange]);

  const periodRevenue = useMemo(
    () => dailySalesData.reduce((sum, point) => sum + point.revenue, 0),
    [dailySalesData]
  );

  const avgDailyRevenue = useMemo(
    () => Math.round(periodRevenue / Math.max(dailySalesData.length, 1)),
    [periodRevenue, dailySalesData.length]
  );

  // Top-selling products ranked by units sold
  const topProductsData = useMemo<TopProductPoint[]>(() => {
    const byProduct = new Map<string, { units: number; revenue: number }>();
    for (const order of orders) {
      const existing = byProduct.get(order.productName) || { units: 0, revenue: 0 };
      existing.units += order.quantity;
      existing.revenue += order.totalPrice;
      byProduct.set(order.productName, existing);
    }

    return Array.from(byProduct.entries())
      .map(([name, stats]) => ({
        name,
        shortName: name.length > 18 ? `${name.slice(0, 17)}…` : name,
        units: stats.units,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
      .slice(0, 6);
  }, [orders]);

  const totalUnitsSold = useMemo(
    () => orders.reduce((sum, o) => sum + o.quantity, 0),
    [orders]
  );

  const fetchInsights = async (force = false) => {
    const hasSignificantChange =
      Math.abs(products.length - lastUpdateRef.current.pCount) > 0 ||
      Math.abs(orders.length - lastUpdateRef.current.oCount) > 0;

    if (!force && !hasSignificantChange && insights.length > 0) return;

    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const data = await getStrategicInsights(products, orders);
      setInsights(data);
      lastUpdateRef.current = { pCount: products.length, oCount: orders.length };
    } catch (err: unknown) {
      setInsightsError(err instanceof Error ? err.message : 'Unable to load AI strategic insights.');
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [products.length, orders.length]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
             <h2 className="text-5xl font-black text-slate-900 tracking-tight">
               Hey, {user?.shopName?.split(' ')[0] || 'Seller'}!
             </h2>
             <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
               <ShieldCheck className="w-3 h-3 mr-1" /> Pro Tier
             </div>
          </div>
          <p className="text-slate-500 text-xl font-medium italic">Empowering your craft for <span className="text-blue-600 font-bold">{new Date().toLocaleDateString('en-BD', { month: 'long', day: 'numeric' })}</span></p>
        </div>
        <div className="hidden lg:flex items-center space-x-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
           <div className="px-4 py-2 bg-green-50 text-green-700 rounded-xl flex items-center font-black text-[10px] uppercase tracking-widest">
             <Zap className="w-3 h-3 mr-2" /> Global Sync: OK
           </div>
        </div>
      </header>

      {/* Stats Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`৳${revenue.toLocaleString()}`} icon={<DollarSign />} color="bg-blue-500" />
        <StatCard title="Net Profit" value={`৳${netProfit.toLocaleString()}`} icon={<Landmark />} color="bg-emerald-600" />
        <StatCard title="New Orders" value={todayOrders.toString()} icon={<ShoppingCart />} color="bg-indigo-500" />
        <StatCard title="Low Stock" value={lowStockCount.toString()} icon={<AlertCircle />} color="bg-red-500" highlight={lowStockCount > 0} />
      </div>

      {/* Sales & Product Analytics Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Daily Sales Trends Line Chart */}
        <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Daily Sales Trends</h3>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1 tabular-nums">
                <span>Period Total: <strong className="text-slate-900">৳{periodRevenue.toLocaleString()}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Avg / Day: <strong className="text-slate-900">৳{avgDailyRevenue.toLocaleString()}</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto" role="group" aria-label="Sales timeframe">
              {([7, 30, 60] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setSalesRange(days)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    salesRange === days
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-center text-slate-400">
              <TrendingUp className="w-10 h-10 mb-3 text-slate-200" />
              <p className="text-sm font-semibold text-slate-600">No sales data yet</p>
              <p className="text-xs text-slate-400 mt-1">Daily revenue trends will appear once orders come in.</p>
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={dailySalesData} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    minTickGap={24}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={formatCompactBdt}
                    width={54}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const point = payload[0].payload as DailySalesPoint;
                      return (
                        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs tabular-nums">
                          <p className="font-bold text-slate-300 mb-1.5">{point.label} ({point.date})</p>
                          <div className="space-y-1">
                            <p className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Revenue</span>
                              <span className="font-bold text-white">৳{point.revenue.toLocaleString()}</span>
                            </p>
                            <p className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Net Profit</span>
                              <span className="font-bold text-emerald-400">৳{point.profit.toLocaleString()}</span>
                            </p>
                            <p className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Orders</span>
                              <span className="font-bold text-blue-300">{point.orderCount}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={salesRange === 7 ? { r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' } : false}
                    activeDot={{ r: 6, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Top-Selling Products by Volume Bar Chart */}
        <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Top-Selling Products</h3>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1 tabular-nums">
                <span>Ranked by volume</span>
                <span aria-hidden="true">·</span>
                <span>Total Units Sold: <strong className="text-slate-900">{totalUnitsSold.toLocaleString()}</strong></span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center whitespace-nowrap shrink-0 transition-colors self-start sm:self-auto"
            >
              View Warehouse <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>

          {topProductsData.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-center text-slate-400">
              <BarChart3 className="w-10 h-10 mb-3 text-slate-200" />
              <p className="text-sm font-semibold text-slate-600">No product sales yet</p>
              <p className="text-xs text-slate-400 mt-1">Top-selling products by unit volume will appear here.</p>
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={topProductsData}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    axisLine={false}
                    tickLine={false}
                    width={132}
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const item = payload[0].payload as TopProductPoint;
                      return (
                        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs tabular-nums">
                          <p className="font-bold text-white mb-1.5">{item.name}</p>
                          <div className="space-y-1">
                            <p className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Units Sold</span>
                              <span className="font-bold text-blue-300">{item.units.toLocaleString()} units</span>
                            </p>
                            <p className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Total Revenue</span>
                              <span className="font-bold text-emerald-400">৳{item.revenue.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="units" radius={[0, 10, 10, 0]} barSize={24}>
                    {topProductsData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={index === 0 ? '#0f172a' : '#2563eb'}
                        fillOpacity={index === 0 ? 1 : Math.max(0.45, 0.95 - index * 0.1)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Strategic Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* AI Strategic Advisor */}
          <section className="bg-slate-900 text-white p-10 rounded-[48px] shadow-3xl shadow-slate-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-48 h-48 rotate-12" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Lightbulb className="text-white w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">AI Strategic Advisor</h3>
                </div>
                {loadingInsights && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
              </div>

              {insightsError ? (
                <div className="p-6 rounded-3xl bg-white/5 border border-red-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-200">{insightsError}</p>
                  </div>
                  <button
                    onClick={() => fetchInsights(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shrink-0 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {loadingInsights && insights.length === 0 ? (
                    [1,2,3].map(i => (
                      <div key={i} className="h-40 bg-white/5 rounded-3xl animate-pulse"></div>
                    ))
                  ) : (
                    insights.map((insight, idx) => (
                      <div key={idx} className="bg-white/5 hover:bg-white/10 p-6 rounded-[32px] border border-white/5 transition-all cursor-pointer group/card">
                        <div className="flex justify-between items-start mb-4">
                          <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded ${insight.impact === 'high' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                            {insight.impact} Impact
                          </span>
                          <TrendingUp className="w-4 h-4 text-blue-400 opacity-50 group-hover/card:opacity-100 transition-opacity" />
                        </div>
                        <h4 className="font-bold text-sm mb-2 group-hover/card:text-blue-400 transition-colors">{insight.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">{insight.description}</p>
                        <button 
                          onClick={() => insight.type === 'marketing' ? onNavigate('post') : insight.type === 'inventory' ? onNavigate('inventory') : onNavigate('orders')}
                          className="text-[9px] font-black uppercase tracking-widest text-white flex items-center hover:translate-x-1 transition-transform"
                        >
                          {insight.actionLabel} <ChevronRight className="ml-1 w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button 
              onClick={() => onNavigate('post')}
              className="group p-10 bg-white border border-slate-100 rounded-[42px] shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all text-left flex flex-col justify-between h-72"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Share2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 mb-2">Broadcaster</h3>
                <p className="text-slate-500 font-medium">Post to all channels with AI</p>
              </div>
              <div className="text-blue-600 font-black text-xs uppercase tracking-widest flex items-center">
                Create Now <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </button>

            <button 
              onClick={() => onNavigate('inventory')}
              className="group p-10 bg-white border border-slate-100 rounded-[42px] shadow-sm hover:shadow-2xl hover:border-emerald-200 transition-all text-left flex flex-col justify-between h-72"
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <ClipboardList className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 mb-2">Warehouse</h3>
                <p className="text-slate-500 font-medium">Predictive stock management</p>
              </div>
              <div className="text-emerald-600 font-black text-xs uppercase tracking-widest flex items-center">
                Manage Stock <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Right Flow Column */}
        <div className="space-y-8">
          <section className="bg-white rounded-[48px] shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
            <div className="p-10 border-b border-slate-50">
              <h3 className="text-2xl font-black text-slate-900">Recent Flow</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Real-time system log</p>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 max-h-[600px]">
              {activities.map(activity => (
                <div key={activity.id} className="p-6 bg-slate-50/50 rounded-3xl border border-transparent hover:border-slate-100 transition-all group">
                  <div className="flex items-start space-x-4">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${activity.type === 'order' ? 'bg-emerald-500' : activity.type === 'inventory' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <div>
                      <p className="text-slate-900 font-bold text-sm leading-tight">{activity.message}</p>
                      <p className="text-[9px] text-slate-400 mt-2 font-black uppercase tracking-widest">{activity.timestamp}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 border-t border-slate-50 bg-slate-50/30">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Market Status</p>
                <div className="flex items-center text-green-600 font-black text-[9px] uppercase tracking-widest">
                  <Globe className="w-3 h-3 mr-1" /> All Channels Live
                </div>
              </div>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactElement<{ className?: string }>, color: string, highlight?: boolean }> = ({ title, value, icon, color, highlight }) => (
  <div className={`p-8 bg-white rounded-[42px] border shadow-sm transition-all hover:shadow-xl ${highlight ? 'border-red-100' : 'border-slate-100'}`}>
    <div className="flex items-center mb-6">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${color}`}>
        {React.cloneElement(icon, { className: "w-6 h-6" })}
      </div>
      <span className="ml-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">{title}</span>
    </div>
    <div className="flex items-end justify-between">
       <p className={`text-4xl font-black tracking-tighter ${highlight ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>{value}</p>
       <TrendingUp className="w-5 h-5 text-slate-100" />
    </div>
  </div>
);

export default Dashboard;
