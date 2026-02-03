import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  query 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  Plus, 
  Minus,
  Trash2, 
  Printer, 
  Zap, 
  Archive, 
  CheckCircle2, 
  Edit3, 
  ChevronRight, 
  ChevronDown, 
  MessageCircle, 
  ListChecks,
  BarChart3,
  History,
  ShoppingCart,
  Database,
  LayoutDashboard,
  Settings,
  Check,
  Hash,
  Store,
  Euro,
  Tag
} from 'lucide-react';

// Firebase Configuratie
const myFirebaseConfig = {
  apiKey: "AIzaSyBbwO5zFRzKg_TeFSTGjm_G7OPitUtnDo0",
  authDomain: "d-printer-orders-1b6f3.firebaseapp.com",
  projectId: "d-printer-orders-1b6f3",
  storageBucket: "d-printer-orders-1b6f3.firebasestorage.app",
  messagingSenderId: "784230424225",
  appId: "1:784230424225:web:abbfb3011e515e1f6d1ae0",
  measurementId: "G-RJW0M8NF7Y"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : myFirebaseConfig;

const hubId = typeof __app_id !== 'undefined' ? __app_id : 'd-printer-orders-1b6f3';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TABS = {
  DASHBOARD: 'Dashboard',
  ORDERS: 'Bestellingen',
  CATALOG: 'Producten',
  DAS_LOODS: 'Das Loods',
  STOCK: 'Filament Voorraad',
  SETTINGS: 'Instellingen'
};

const ORDER_STATUSES = ['In de wacht', 'Printen', 'Gereed', 'Afgerond'];

const getFilamentGramPrice = (filaments, key) => {
  const activeRolls = filaments.filter(f => f.status === 'actief' && `${f.brand}-${f.materialType}-${f.colorName}` === key);
  const targetRoll = activeRolls.length > 0 ? activeRolls[0] : filaments.find(f => `${f.brand}-${f.materialType}-${f.colorName}` === key);
  return (targetRoll && targetRoll.price && targetRoll.totalWeight) ? targetRoll.price / targetRoll.totalWeight : 0;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [filaments, setFilaments] = useState([]);
  const [settings, setSettings] = useState({ kwhPrice: 0.35, printerWattage: 150 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error(err); setLoading(false); }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const getPath = (name) => collection(db, 'artifacts', hubId, 'public', 'data', name);
    const unsubOrders = onSnapshot(query(getPath('orders')), (s) => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubProducts = onSnapshot(query(getPath('products')), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubFilaments = onSnapshot(query(getPath('filaments')), (s) => setFilaments(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSettings = onSnapshot(doc(db, 'artifacts', hubId, 'public', 'data', 'settings', 'global'), (s) => s.exists() && setSettings(s.data()));
    setLoading(false);
    return () => { unsubOrders(); unsubProducts(); unsubFilaments(); unsubSettings(); };
  }, [user]);

  const updateItem = async (coll, id, data) => { 
    if (!user) return; 
    await updateDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id), data); 
  };
  const addItem = async (coll, data) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', hubId, 'public', 'data', coll), { ...data, createdAt: new Date().toISOString() });
  };
  const deleteItem = async (coll, id) => { 
    if (!user) return; 
    await deleteDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id)); 
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-purple-600 animate-pulse uppercase tracking-widest">Laden...</div>;

  return (
    <div className="min-h-screen bg-[#FDFCFE] flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">
      <nav className="w-full md:w-72 bg-white border-r border-slate-100 p-6 flex flex-col gap-2 z-20 shadow-sm overflow-y-auto">
        <div className="text-xl font-black text-purple-600 mb-10 flex items-center gap-3 px-2 italic text-balance">
          <div className="p-2 bg-purple-600 rounded-xl text-white shadow-md shadow-purple-100"><Printer size={20} strokeWidth={3} /></div>
          Rosevalley 3D Hub
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {Object.entries(TABS).map(([key, tab]) => {
            const isActive = activeTab === tab;
            return (
              <button 
                key={key} 
                onClick={() => setActiveTab(tab)} 
                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all border-none outline-none focus:outline-none focus:ring-0 appearance-none select-none font-bold uppercase tracking-tight text-sm ${
                  isActive 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' 
                    : 'text-purple-600 bg-transparent hover:bg-purple-50'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen bg-[#FDFCFE]">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic underline decoration-purple-600 decoration-4 underline-offset-8">{activeTab}</h1>
        </header>

        {activeTab === TABS.DASHBOARD && <Dashboard orders={orders} products={products} filaments={filaments} settings={settings} />}
        {activeTab === TABS.ORDERS && <OrderList orders={orders} products={products} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} isDasLoodsFilter={false} />}
        {activeTab === TABS.CATALOG && <ProductList products={products} filaments={filaments} orders={orders} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} settings={settings} isDasLoodsFilter={false} />}
        {activeTab === TABS.DAS_LOODS && <DasLoodsSection orders={orders} products={products} filaments={filaments} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} settings={settings} />}
        {activeTab === TABS.STOCK && <StockTable filaments={filaments} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />}
        {activeTab === TABS.SETTINGS && <SettingsPanel settings={settings} onSave={(d) => setDoc(doc(db, 'artifacts', hubId, 'public', 'data', 'settings', 'global'), d)} />}
      </main>
    </div>
  );
}

function Dashboard({ orders, products, filaments, settings }) {
  const stats = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    let pendingRevenue = 0;
    let totalNeededWeight = 0;
    let totalConsumedWeight = 0;
    
    const productStats = {};
    const filamentNeeds = {};
    const filamentConsumedBreakdown = {};
    const filamentKeyStockRemaining = {};
    const pendingProductsBreakdown = {};
    
    filaments.forEach(f => {
      if (f.status === 'leeg') return;
      const key = `${f.brand}-${f.materialType}-${f.colorName}`;
      const remaining = (Number(f.totalWeight) || 0) - (Number(f.usedWeight) || 0);
      if (!filamentKeyStockRemaining[key]) filamentKeyStockRemaining[key] = 0;
      filamentKeyStockRemaining[key] = (filamentKeyStockRemaining[key] || 0) + remaining;
    });

    const regularOrders = orders.filter(o => !o.isDasLoods);

    const completedOrders = regularOrders.filter(o => (o.items || []).every(i => i.status === 'Afgerond'));
    const readyOrders = regularOrders.filter(o => (o.items || []).length > 0 && (o.items || []).every(i => i.status === 'Gereed' || i.status === 'Afgerond') && !(o.items || []).every(i => i.status === 'Afgerond'));
    const waitingOrders = regularOrders.filter(o => (o.items || []).some(i => i.status === 'In de wacht' || i.status === 'Printen'));

    completedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const itemRev = (Number(item.price) || 0) * (Number(item.quantity) || 0);
        revenue += itemRev;
        const p = products.find(prod => prod.id === item.productId);
        if (p) {
          const matCost = (p.filaments || []).reduce((s, f) => s + (f.weight * getFilamentGramPrice(filaments, f.key)), 0);
          const energy = (p.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
          const totalItemCost = (matCost + energy) * (Number(item.quantity) || 0);
          cost += totalItemCost;
          if (!productStats[p.id]) productStats[p.id] = { name: p.name, revenue: 0, profit: 0, count: 0 };
          productStats[p.id].revenue += itemRev;
          productStats[p.id].profit += (itemRev - totalItemCost);
          productStats[p.id].count += Number(item.quantity) || 0;
        }
      });
    });

    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        if (!p) return;

        const quantity = Number(item.quantity) || 0;
        const ready = Number(item.readyQuantity) || 0;
        const remaining = Math.max(0, quantity - ready);

        if (item.status === 'Afgerond') {
          if (p.filaments) {
            p.filaments.forEach(f => {
              const weightContribution = f.weight * quantity;
              totalConsumedWeight += weightContribution;
              if (!filamentConsumedBreakdown[f.key]) {
                filamentConsumedBreakdown[f.key] = { weight: 0, info: filaments.find(fil => `${fil.brand}-${fil.materialType}-${fil.colorName}` === f.key) };
              }
              filamentConsumedBreakdown[f.key].weight += weightContribution;
            });
          }
        }

        if (item.status === 'In de wacht' || item.status === 'Printen') {
          if (remaining > 0) {
            if (!pendingProductsBreakdown[p.id]) pendingProductsBreakdown[p.id] = { name: p.name, count: 0 };
            pendingProductsBreakdown[p.id].count += remaining;

            if (p.filaments) {
              p.filaments.forEach(f => {
                const needed = (f.weight * remaining);
                if (!filamentNeeds[f.key]) filamentNeeds[f.key] = 0;
                filamentNeeds[f.key] += needed;
                totalNeededWeight += needed;
              });
            }
          }
        }
        
        if (!o.isDasLoods && item.status !== 'Afgerond') {
          pendingRevenue += (Number(item.price) || 0) * remaining;
        }
      });
    });

    return { 
      revenue, profit: revenue - cost, pendingRevenue, totalNeededWeight, totalConsumedWeight,
      waitingOrderCount: waitingOrders.length, readyOrderCount: readyOrders.length, completedOrderCount: completedOrders.length,
      productStats: Object.values(productStats).sort((a,b) => b.revenue - a.revenue),
      pendingProductsBreakdown: Object.values(pendingProductsBreakdown).sort((a,b) => b.count - a.count),
      filamentNeeds: Object.entries(filamentNeeds).map(([key, weight]) => ({
        key, weight, isShortage: weight > (filamentKeyStockRemaining[key] || 0),
        info: filaments.find(f => `${f.brand}-${f.materialType}-${f.colorName}` === key)
      })).sort((a,b) => b.weight - a.weight),
      filamentConsumedBreakdown: Object.entries(filamentConsumedBreakdown).map(([key, data]) => ({ key, weight: data.weight, info: data.info })).sort((a,b) => b.weight - a.weight)
    };
  }, [orders, products, filaments, settings]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
        <StatCard title="Omzet" value={`€${stats.revenue.toFixed(2)}`} color="text-purple-600" />
        <StatCard title="Winst" value={`€${stats.profit.toFixed(2)}`} color="text-emerald-600" />
        <StatCard title="Nog te innen" value={`€${stats.pendingRevenue.toFixed(2)}`} color="text-purple-500" />
        <StatCard title="Verbruikt" value={`${Math.round(stats.totalConsumedWeight)}g`} color="text-slate-500" />
        <StatCard title="Productie" value={stats.waitingOrderCount} color="text-orange-500" />
        <StatCard title="Klaar" value={stats.readyOrderCount} color="text-emerald-500" />
        <StatCard title="Afgerond" value={stats.completedOrderCount} color="text-slate-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><BarChart3 size={20}/></div>
             <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">Prestaties</h2>
          </div>
          <div className="overflow-hidden text-xs text-slate-700 font-bold">
            <table className="w-full text-left">
               <thead className="uppercase font-black text-slate-300 border-b border-slate-50">
                 <tr><th className="pb-4">Product</th><th className="pb-4 text-center">Aantal</th><th className="pb-4 text-right">Winst</th></tr>
               </thead>
               <tbody className="divide-y divide-slate-50 font-bold">
                 {stats.productStats.slice(0, 5).map((ps, idx) => (
                    <tr key={idx}>
                      <td className="py-4 font-bold text-slate-700">{ps.name}</td>
                      <td className="py-4 text-center font-black text-slate-500">{ps.count}x</td>
                      <td className="py-4 text-right font-black text-emerald-500">€{ps.profit.toFixed(2)}</td>
                    </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Printer size={20}/></div>
             <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">In Wacht</h2>
          </div>
          <div className="space-y-4 flex-1">
             {stats.pendingProductsBreakdown.map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <p className="text-xs font-bold text-slate-700">{item.name}</p>
                    <p className="text-sm font-black text-purple-600 italic">{item.count}x</p>
                 </div>
             ))}
             {stats.pendingProductsBreakdown.length === 0 && <p className="text-[10px] font-black uppercase text-slate-300 text-center py-10 tracking-widest">Alles is gereed!</p>}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><ShoppingCart size={20}/></div>
             <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">Filament Nood</h2>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto">
             {stats.filamentNeeds.map((need, idx) => (
                 <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${need.isShortage ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-transparent'}`}>
                    <div className="flex items-center gap-3">
                       <div className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: need.info?.colorCode || '#ccc' }}></div>
                       <div>
                          <p className="text-xs font-bold text-slate-700">{need.info ? `${need.info.brand} ${need.info.materialType}` : 'Onbekend'}</p>
                          <p className="text-[9px] font-black uppercase text-slate-500">{need.info?.colorName || need.key}</p>
                       </div>
                    </div>
                    <p className="text-sm font-black italic text-slate-700">{Math.round(need.weight)}g</p>
                 </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><History size={20}/></div>
             <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">Historie</h2>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto">
             {stats.filamentConsumedBreakdown.slice(0, 6).map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl group hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: item.info?.colorCode || '#ccc' }}></div>
                       <div>
                          <p className="text-xs font-bold text-slate-700">{item.info?.brand || 'Onbekend'}</p>
                          <p className="text-[9px] font-black uppercase text-slate-400">{item.info?.colorName || item.key}</p>
                       </div>
                    </div>
                    <p className="text-sm font-black text-slate-600 italic">{Math.round(item.weight)}g</p>
                 </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DasLoodsSection({ orders, products, filaments, onAdd, onUpdate, onDelete, settings }) {
  const [subTab, setSubTab] = useState('Bestellingen');
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200 shadow-inner">
        {['Bestellingen', 'Producten'].map(t => (
          <button 
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none outline-none appearance-none cursor-pointer font-bold ${
              subTab === t 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-purple-600 bg-transparent hover:bg-purple-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {subTab === 'Bestellingen' ? (
        <OrderList orders={orders} products={products} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} isDasLoodsFilter={true} />
      ) : (
        <ProductList products={products} filaments={filaments} orders={orders} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} settings={settings} isDasLoodsFilter={true} />
      )}
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center leading-tight">{title}</p>
      <p className={`text-xl font-black italic tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}

function OrderList({ orders, products, onAdd, onUpdate, onDelete, isDasLoodsFilter }) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [formData, setFormData] = useState({ 
    customer: isDasLoodsFilter ? 'Das Loods' : '', 
    messengerLink: '', 
    orderDate: new Date().toISOString().split('T')[0], 
    orderTime: new Date().toTimeString().slice(0,5),
    items: [{ productId: '', quantity: 1, readyQuantity: 0, price: '', status: 'In de wacht' }],
    comments: '',
    isDasLoods: isDasLoodsFilter
  });

  const filteredOrders = useMemo(() => orders.filter(o => !!o.isDasLoods === !!isDasLoodsFilter), [orders, isDasLoodsFilter]);

  const grouped = useMemo(() => {
    const active = [];
    const ready = [];
    const completed = [];
    filteredOrders.forEach(o => {
      const items = o.items || [];
      const allCompleted = items.length > 0 && items.every(i => i.status === 'Afgerond');
      const allReadyOrDone = items.length > 0 && items.every(i => i.status === 'Gereed' || i.status === 'Afgerond');
      
      if (allCompleted) completed.push(o);
      else if (allReadyOrDone) ready.push(o);
      else active.push(o);
    });
    return { active, ready, completed };
  }, [filteredOrders]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = { ...formData };
    if (isDasLoodsFilter) {
      dataToSave.customer = formData.customer || 'Das Loods';
      dataToSave.orderTime = '';
      dataToSave.messengerLink = '';
    }
    editingId ? onUpdate('orders', editingId, dataToSave) : onAdd('orders', dataToSave);
    setShowModal(false);
    setEditingId(null);
  };

  const handlePartialReadyUpdate = (orderId, itemIndex, increment) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newItems = [...order.items];
    const item = newItems[itemIndex];
    const newCount = Math.min(Number(item.quantity), Math.max(0, (Number(item.readyQuantity) || 0) + increment));
    item.readyQuantity = newCount;
    if (newCount === Number(item.quantity)) item.status = 'Gereed';
    else if (newCount > 0) item.status = 'Printen';
    onUpdate('orders', orderId, { items: newItems });
  };

  const handleStatusUpdate = (orderId, itemIndex, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newItems = [...order.items];
    newItems[itemIndex].status = newStatus;
    if (newStatus === 'Gereed') newItems[itemIndex].readyQuantity = newItems[itemIndex].quantity;
    onUpdate('orders', orderId, { items: newItems });
  };

  const handleMarkAllReady = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newItems = order.items.map(item => ({
      ...item,
      status: 'Gereed',
      readyQuantity: item.quantity
    }));
    onUpdate('orders', orderId, { items: newItems });
  };

  const handleMarkAllCompleted = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newItems = order.items.map(item => ({
      ...item,
      status: 'Afgerond'
    }));
    onUpdate('orders', orderId, { items: newItems });
  };

  const OrderTable = ({ list, title, isCompletedSection = false, isReadySection = false }) => {
    const sortedList = useMemo(() => {
      return [...list].sort((a, b) => {
        const isPrintingA = (a.items || []).some(i => i.status === 'Printen') ? 0 : 1;
        const isPrintingB = (b.items || []).some(i => i.status === 'Printen') ? 0 : 1;
        if (isPrintingA !== isPrintingB) return isPrintingA - isPrintingB;
        const dateA = new Date(`${a.orderDate}T${a.orderTime || '00:00'}`);
        const dateB = new Date(`${b.orderDate}T${b.orderTime || '00:00'}`);
        return dateA - dateB;
      });
    }, [list]);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-4">
          <div className={`p-1.5 rounded-lg ${isReadySection ? 'bg-emerald-100 text-emerald-600' : isCompletedSection ? 'bg-slate-100 text-slate-400' : 'bg-purple-100 text-purple-600'}`}>
            {isReadySection ? <Check size={14} strokeWidth={3} /> : isCompletedSection ? <Archive size={14} /> : <ListChecks size={14} />}
          </div>
          <h2 className={`text-sm font-black uppercase tracking-widest ${isReadySection ? 'text-emerald-500' : 'text-slate-600'}`}>
            {title} ({list.length})
          </h2>
        </div>
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs font-bold text-slate-700">
            <thead className="bg-slate-50/50 text-slate-400 text-[9px] uppercase font-black tracking-widest border-b border-slate-100">
              <tr><th className="px-8 py-4">Klant / Datum</th><th className="px-8 py-4">Items & Voortgang</th><th className="px-8 py-4 text-center">Bedrag</th><th className="px-8 py-4 text-right">Beheer</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold">
              {sortedList.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-900 font-bold text-sm">{o.customer}</p>
                      {o.messengerLink && <a href={o.messengerLink} target="_blank" rel="noreferrer" className="text-purple-500 hover:text-purple-700"><MessageCircle size={14}/></a>}
                    </div>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-1">{o.orderDate} {o.orderTime}</p>
                    {o.comments && <p className="text-[10px] text-slate-500 font-medium italic mt-1 line-clamp-1 group-hover:line-clamp-none">{o.comments}</p>}
                  </td>
                  <td className="px-8 py-5">
                     <div className="space-y-3">
                      {(o.items || []).map((item, idx) => {
                        const isFullyReady = (item.readyQuantity || 0) === Number(item.quantity) || item.status === 'Gereed';
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="flex flex-col gap-1 min-w-40">
                               <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase w-fit ${item.status === 'Afgerond' ? 'bg-slate-100 text-slate-500' : isFullyReady ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-700'}`}>
                                 {item.quantity}x {products.find(p => p.id === item.productId)?.name || '?'}
                               </span>
                               {Number(item.quantity) > 1 && !isCompletedSection && (
                                 <div className="flex items-center gap-2 px-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Gereed: {item.readyQuantity || 0}/{item.quantity}</p>
                                    <button onClick={() => handlePartialReadyUpdate(o.id, idx, 1)} className="p-1 bg-emerald-50 text-emerald-600 rounded-md border-none appearance-none cursor-pointer"><Plus size={10} strokeWidth={4}/></button>
                                 </div>
                               )}
                            </div>
                            {!isCompletedSection && (
                              <select className="bg-transparent border-none text-[9px] font-black uppercase text-slate-600 outline-none appearance-none cursor-pointer hover:text-purple-600 transition-colors" value={item.status} onChange={(e) => handleStatusUpdate(o.id, idx, e.target.value)}>
                                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            )}
                          </div>
                        );
                      })}
                     </div>
                  </td>
                  <td className="px-8 py-5 text-slate-900 font-black italic text-center">
                     €{(o.items || []).reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0).toFixed(2)}
                  </td>
                  <td className="px-8 py-5 text-right flex justify-end items-center gap-2">
                    {!isCompletedSection && !isReadySection && (
                      <button 
                        onClick={() => handleMarkAllReady(o.id)} 
                        className="px-3 py-1.5 border border-purple-600 text-purple-600 rounded-xl text-[9px] font-black uppercase hover:bg-purple-600 hover:text-white transition-all appearance-none cursor-pointer"
                      >
                        Alles Gereed
                      </button>
                    )}
                    {isReadySection && (
                      <button 
                        onClick={() => handleMarkAllCompleted(o.id)} 
                        className="px-3 py-1.5 border border-slate-600 text-slate-600 rounded-xl text-[9px] font-black uppercase hover:bg-slate-600 hover:text-white transition-all appearance-none cursor-pointer"
                      >
                        Alles Afronden
                      </button>
                    )}
                    <button onClick={() => { setEditingId(o.id); setFormData(o); setShowModal(true); }} className="p-2 text-slate-400 hover:text-purple-600 bg-transparent border-none appearance-none cursor-pointer transition-colors"><Edit3 size={16}/></button>
                    <button onClick={() => onDelete('orders', o.id)} className="p-2 text-slate-400 hover:text-rose-500 bg-transparent border-none appearance-none cursor-pointer transition-colors"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <button 
        onClick={() => { setEditingId(null); setFormData({ customer: isDasLoodsFilter ? 'Das Loods' : '', messengerLink: '', orderDate: new Date().toISOString().split('T')[0], orderTime: new Date().toTimeString().slice(0,5), items: [{ productId: '', quantity: 1, readyQuantity: 0, price: '', status: 'In de wacht' }], comments: '', isDasLoods: isDasLoodsFilter }); setShowModal(true); }} 
        className="bg-purple-600 text-white px-10 py-4 rounded-2xl font-black uppercase italic shadow-xl border-none appearance-none cursor-pointer transition-all hover:bg-purple-700"
      >
        <Plus size={18} className="inline mr-2" strokeWidth={3} /> {isDasLoodsFilter ? 'Das Loods Order' : 'Bestelling Invoeren'}
      </button>

      <OrderTable list={grouped.active} title="Lopende Bestellingen" />
      {grouped.ready.length > 0 && <OrderTable list={grouped.ready} title="Gereed voor Afhalen" isReadySection={true} />}
      {grouped.completed.length > 0 && (
        <div className="space-y-4">
          <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2 text-[10px] font-black uppercase text-purple-600 border border-purple-100 px-4 py-2 rounded-xl bg-transparent cursor-pointer hover:bg-purple-50 transition-colors appearance-none tracking-widest">
            {showCompleted ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} ARCHIEF
          </button>
          {showCompleted && <OrderTable list={grouped.completed} title="Afgeronde Bestellingen" isCompletedSection={true} />}
        </div>
      )}

      {showModal && <Modal title={editingId ? "Aanpassen" : "Nieuw"} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isDasLoodsFilter && <Input label="Klant Naam" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} required />}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bestel Datum" type="date" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} required />
            {!isDasLoodsFilter && <Input label="Bestel Tijd" type="time" value={formData.orderTime} onChange={e => setFormData({...formData, orderTime: e.target.value})} />}
          </div>
          {!isDasLoodsFilter && <Input label="Chat Link" value={formData.messengerLink} onChange={e => setFormData({...formData, messengerLink: e.target.value})} />}
          <div className="space-y-3">
             <div className="flex justify-between items-center"><label className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Producten</label><button type="button" onClick={() => setFormData({...formData, items: [...formData.items, {productId: '', quantity: 1, readyQuantity: 0, price: '', status: 'In de wacht'}]})} className="text-purple-600 text-[9px] font-black uppercase bg-transparent border-none appearance-none cursor-pointer font-black">+ Item</button></div>
             <div className="space-y-3 bg-slate-50 p-4 rounded-2xl max-h-60 overflow-y-auto shadow-inner">
               {formData.items.map((it, idx) => (
                 <div key={idx} className="bg-white p-3 rounded-xl border-none relative shadow-sm">
                   {formData.items.length > 1 && <button type="button" onClick={() => setFormData({...formData, items: formData.items.filter((_, i) => i !== idx)})} className="absolute top-1 right-1 text-slate-400 hover:text-rose-500 border-none appearance-none bg-transparent"><Minus size={14}/></button>}
                   <select required className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold border-none appearance-none outline-none text-slate-900 font-bold" value={it.productId} onChange={e => {
                     const ni = [...formData.items]; 
                     ni[idx].productId = e.target.value;
                     const p = products.find(prod => prod.id === e.target.value);
                     if (p) ni[idx].price = p.suggestedPrice || '';
                     setFormData({...formData, items: ni});
                   }}>
                     <option value="">Selecteer Product...</option>
                     {products.filter(p => !!p.isDasLoods === !!isDasLoodsFilter && p.status !== 'gearchiveerd').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <div className="grid grid-cols-2 gap-2 mt-2">
                     <input type="number" className="p-2 bg-slate-50 rounded-lg text-xs font-black border-none outline-none text-slate-900" value={it.quantity} onChange={e => {const ni = [...formData.items]; ni[idx].quantity = e.target.value; setFormData({...formData, items: ni});}} placeholder="Aantal" />
                     <input type="number" step="0.01" className="p-2 bg-slate-50 rounded-lg text-xs font-black border-none outline-none text-slate-900" value={it.price} onChange={e => {const ni = [...formData.items]; ni[idx].price = e.target.value; setFormData({...formData, items: ni});}} placeholder="Prijs" />
                   </div>
                 </div>
               ))}
             </div>
             <div className="space-y-1 mt-4">
               <label className="text-[9px] font-black uppercase text-slate-600 tracking-widest ml-3">Opmerkingen</label>
               <textarea rows="2" className="w-full p-4 bg-slate-50 rounded-[1.5rem] border-none font-medium text-slate-700 shadow-inner outline-none focus:bg-slate-100 transition-all appearance-none" value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} placeholder="Extra informatie over de bestelling..." />
             </div>
          </div>
          <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase shadow-lg border-none appearance-none cursor-pointer italic hover:bg-purple-700 transition-all">Opslaan</button>
        </form>
      </Modal>}
    </div>
  );
}

function ProductList({ products, filaments, orders, onAdd, onUpdate, onDelete, settings, isDasLoodsFilter }) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [formData, setFormData] = useState({ name: '', filaments: [], suggestedPrice: '', timeH: 0, timeM: 0, isDasLoods: isDasLoodsFilter });
  const filteredProducts = useMemo(() => products.filter(p => !!p.isDasLoods === !!isDasLoodsFilter), [products, isDasLoodsFilter]);
  const uniqueFilamentTypes = useMemo(() => {
    const types = {};
    filaments.forEach(f => {
      const key = `${f.brand}-${f.materialType}-${f.colorName}`;
      if (!types[key]) types[key] = { key, color: f.colorCode, brand: f.brand, materialType: f.materialType, colorName: f.colorName };
    });
    return Object.values(types);
  }, [filaments]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button 
        onClick={() => { setEditingId(null); setFormData({name:'', filaments:[], suggestedPrice:'', timeH:0, timeM:0, isDasLoods: isDasLoodsFilter }); setShowModal(true); }} 
        className="bg-purple-600 text-white px-10 py-4 rounded-2xl font-black uppercase italic shadow-lg border-none appearance-none cursor-pointer transition-all hover:bg-purple-700"
      >
        <Plus size={18} className="inline mr-2" strokeWidth={3} /> {isDasLoodsFilter ? 'Nieuw Das Loods Product' : 'Nieuw Product'}
      </button>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50/50 text-slate-400 text-[9px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr><th className="px-8 py-4">Product</th><th className="px-8 py-4 text-center">Voorraad</th><th className="px-8 py-4 text-right">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold">
            {filteredProducts.map(p => (
              <React.Fragment key={p.id}>
                <tr onClick={() => setExpanded({...expanded, [p.id]: !expanded[p.id]})} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                  <td className="px-8 py-5">
                    <p className="text-slate-900 font-bold text-sm">{p.name}</p>
                    <div className="flex gap-1 mt-1">
                      {(p.filaments || []).map(f => (
                        <div key={f.key} className="w-2.5 h-2.5 rounded-full border border-slate-100" style={{ backgroundColor: filaments.find(fil => `${fil.brand}-${fil.materialType}-${fil.colorName}` === f.key)?.colorCode }}></div>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                     <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onUpdate('products', p.id, {stockQuantity: (p.stockQuantity || 0) - 1}); }} 
                          className="p-1.5 border border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white rounded-lg border-none appearance-none cursor-pointer transition-all"
                        >
                          <Minus size={12}/>
                        </button>
                        <p className="font-black text-slate-800 w-8">{p.stockQuantity || 0}</p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onUpdate('products', p.id, {stockQuantity: (p.stockQuantity || 0) + 1}); }} 
                          className="p-1.5 border border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white rounded-lg border-none appearance-none cursor-pointer transition-all"
                        >
                          <Plus size={12}/>
                        </button>
                      </div>
                  </td>
                  <td className="px-8 py-5 text-right text-slate-400">{expanded[p.id] ? <ChevronDown size={20} className="text-purple-600"/> : <ChevronRight size={20}/>}</td>
                </tr>
                {expanded[p.id] && (
                  <tr className="bg-slate-50/30 border-l-4 border-purple-500 animate-in slide-in-from-left-2 text-slate-800">
                    <td colSpan="3" className="px-10 py-6">
                       <div className="flex gap-10">
                          <div><p className="text-[9px] uppercase font-black text-slate-500 mb-1 tracking-widest">Gewicht</p><p className="text-sm font-bold text-slate-700">{p.weight}g</p></div>
                          <div><p className="text-[9px] uppercase font-black text-slate-500 mb-1 tracking-widest">Kostprijs</p><p className="text-sm font-black text-slate-900 italic">€{((p.filaments || []).reduce((s, f) => s + (f.weight * getFilamentGramPrice(filaments, f.key)), 0) + (p.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice).toFixed(2)}</p></div>
                          <div className="flex-1 text-right flex items-center justify-end gap-2">
                             <button onClick={() => { setEditingId(p.id); setFormData({ ...p, timeH: Math.floor(p.printTime / 60), timeM: p.printTime % 60 }); setShowModal(true); }} className="p-2 border border-purple-600 text-purple-600 rounded-xl shadow-sm hover:bg-purple-600 hover:text-white transition-all appearance-none cursor-pointer"><Edit3 size={16}/></button>
                             <button onClick={() => onDelete('products', p.id)} className="p-2 border border-rose-600 text-rose-600 rounded-xl shadow-sm hover:bg-rose-600 hover:text-white transition-all appearance-none cursor-pointer"><Trash2 size={16}/></button>
                          </div>
                       </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <Modal title={editingId ? "Bewerken" : "Nieuw"} onClose={() => setShowModal(false)}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const final = { name: formData.name, filaments: formData.filaments, printTime: (Number(formData.timeH) * 60) + Number(formData.timeM), suggestedPrice: Number(formData.suggestedPrice), weight: formData.filaments.reduce((s,f) => s + Number(f.weight), 0), isDasLoods: isDasLoodsFilter };
          editingId ? onUpdate('products', editingId, final) : onAdd('products', {...final, stockQuantity: 0, status: 'actief'});
          setShowModal(false);
        }} className="space-y-6">
          <Input label="Naam" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Uren" type="number" value={formData.timeH} onChange={e => setFormData({...formData, timeH: e.target.value})} />
            <Input label="Minuten" type="number" value={formData.timeM} onChange={e => setFormData({...formData, timeM: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-600 font-black tracking-widest">Filament Behoefte</label>
            <div className="bg-slate-50 p-4 rounded-2xl max-h-48 overflow-y-auto space-y-2 shadow-inner">
              {uniqueFilamentTypes.map(type => {
                const assign = formData.filaments.find(f => f.key === type.key);
                return (
                  <div key={type.key} className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, filaments: assign ? formData.filaments.filter(f => f.key !== type.key) : [...formData.filaments, {key: type.key, weight: 0}]})} 
                      className={`flex-1 p-3 rounded-xl text-[9px] font-black uppercase flex items-center gap-3 border-none appearance-none cursor-pointer transition-all ${
                        assign 
                          ? 'bg-purple-600 text-white shadow-md font-black' 
                          : 'text-purple-600 border border-purple-100 bg-white'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full border-none shadow-sm" style={{backgroundColor: type.color}}></div> {type.brand} {type.materialType} {type.colorName}
                    </button>
                    {assign && <input type="number" className="w-16 p-2 bg-white rounded-lg text-[10px] font-black border border-purple-100 outline-none shadow-sm text-slate-900" value={assign.weight} onChange={e => setFormData({...formData, filaments: formData.filaments.map(f => f.key === type.key ? {...f, weight: Number(e.target.value)} : f)})} />}
                  </div>
                );
              })}
            </div>
          </div>
          <Input label="Verkoopprijs (€)" type="number" step="0.01" value={formData.suggestedPrice} onChange={e => setFormData({...formData, suggestedPrice: e.target.value})} required />
          <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase shadow-lg border-none appearance-none cursor-pointer italic hover:bg-purple-700 transition-all">Opslaan</button>
        </form>
      </Modal>}
    </div>
  );
}

function StockTable({ filaments, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [archived, setArchived] = useState(false);
  const [formData, setFormData] = useState({ 
    brand: '', 
    materialType: 'PLA', 
    colorName: '', 
    colorCode: '#9333ea', 
    totalWeight: 1000, 
    price: '', 
    purchaseDate: new Date().toISOString().split('T')[0], 
    shop: '', 
    quantity: 1 
  });

  const grouped = useMemo(() => {
    const res = {};
    filaments.filter(f => archived ? f.status === 'leeg' : f.status !== 'leeg').forEach(f => {
      const k = `${f.brand}-${f.materialType}-${f.colorName}`;
      if (!res[k]) res[k] = { ...f, rolls: [] };
      res[k].rolls.push(f);
    });
    return Object.values(res);
  }, [filaments, archived]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await onUpdate('filaments', editingId, { 
        brand: formData.brand,
        materialType: formData.materialType,
        colorName: formData.colorName,
        colorCode: formData.colorCode,
        totalWeight: Number(formData.totalWeight),
        price: Number(formData.price),
        purchaseDate: formData.purchaseDate,
        shop: formData.shop
      });
    } else {
      const qty = Math.max(1, Number(formData.quantity) || 1);
      for (let i = 0; i < qty; i++) {
        await onAdd('filaments', { 
          brand: formData.brand,
          materialType: formData.materialType,
          colorName: formData.colorName,
          colorCode: formData.colorCode,
          totalWeight: Number(formData.totalWeight),
          price: Number(formData.price),
          purchaseDate: formData.purchaseDate,
          shop: formData.shop,
          usedWeight: 0, 
          status: 'actief' 
        });
      }
    }
    setShowModal(false);
    setEditingId(null);
  };

  const handleManualConsumption = (rolId, currentUsed, val) => {
    const amount = Number(val);
    if (!isNaN(amount) && amount > 0) {
      onUpdate('filaments', rolId, { usedWeight: (currentUsed || 0) + amount });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button 
          onClick={() => { 
            setEditingId(null); 
            setFormData({ brand: '', materialType: 'PLA', colorName: '', colorCode: '#9333ea', totalWeight: 1000, price: '', purchaseDate: new Date().toISOString().split('T')[0], shop: '', quantity: 1 }); 
            setShowModal(true); 
          }} 
          className="bg-purple-600 text-white px-10 py-4 rounded-2xl font-black uppercase italic shadow-lg border-none appearance-none cursor-pointer hover:bg-purple-700 transition-all"
        >+ Rol Toevoegen</button>
        <button 
          onClick={() => setArchived(!archived)} 
          className="text-[10px] font-black uppercase text-purple-600 border border-purple-100 bg-white px-4 py-2 rounded-xl appearance-none cursor-pointer hover:bg-purple-50 transition-colors tracking-widest"
        >
          {archived ? 'Toon Actief' : 'Toon Leeg'}
        </button>
      </div>
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-900">
          <thead className="bg-slate-50/50 text-slate-400 text-[9px] uppercase font-black border-b border-slate-100">
            <tr><th className="px-8 py-4 tracking-widest">Kleur</th><th className="px-8 py-4 tracking-widest">Naam</th><th className="px-8 py-4 tracking-widest">Voorraad</th><th className="px-8 py-4 text-right tracking-widest">Beheer</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold">
            {grouped.map(g => {
              const k = `${g.brand}-${g.materialType}-${g.colorName}`;
              const totalRemaining = g.rolls.reduce((s, r) => s + (Number(r.totalWeight) - (Number(r.usedWeight) || 0)), 0);
              return (
                <React.Fragment key={k}>
                  <tr onClick={() => setExpanded({...expanded, [k]: !expanded[k]})} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                    <td className="px-8 py-5"><div className="w-8 h-8 rounded-xl border-none shadow-inner" style={{backgroundColor: g.colorCode}}></div></td>
                    <td className="px-8 py-5"><p className="text-slate-900 font-bold text-sm">{g.brand} {g.materialType}</p><p className="text-[9px] text-slate-400 uppercase font-black">{g.colorName}</p></td>
                    <td className="px-8 py-5 font-black text-slate-900 italic text-lg">{Math.round(totalRemaining)}g</td>
                    <td className="px-8 py-5 text-right text-slate-400">{expanded[k] ? <ChevronDown size={22} className="text-purple-600"/> : <ChevronRight size={22}/>}</td>
                  </tr>
                  {expanded[k] && g.rolls.map(r => (
                    <tr key={r.id} className="bg-slate-50/30 border-l-4 border-purple-500 animate-in slide-in-from-left-2">
                      <td colSpan="1" className="px-10 py-4">
                        <p className="uppercase text-slate-900 font-black tracking-widest text-[10px] mb-2 leading-none">Rol #{r.id.slice(-4)}</p>
                        <div className="space-y-1.5 border-t border-slate-200 pt-2">
                          <div className="flex items-center gap-2 text-[10px] text-purple-700 font-black">
                            <Store size={14} className="text-purple-500" /> <span className="uppercase tracking-tight">Winkel: {r.shop || '??'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-emerald-700 font-black">
                            <Euro size={14} className="text-emerald-500" /> <span className="uppercase tracking-tight">Prijs: €{Number(r.price)?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm w-fit border border-purple-100">
                          <Hash size={14} className="text-purple-500"/>
                          <input 
                            type="number" 
                            placeholder="Verbruik (g)..." 
                            className="bg-transparent border-none outline-none font-black text-xs w-24 text-slate-900"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.target.value) {
                                handleManualConsumption(r.id, r.usedWeight || 0, e.target.value);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                        <p className="text-[8px] text-slate-400 mt-1 uppercase font-black">Enter om op te slaan</p>
                      </td>
                      <td className="px-8 py-4 font-black italic text-slate-800">
                         <div className="text-sm">{Math.round(Number(r.totalWeight) - (Number(r.usedWeight) || 0))}g / {r.totalWeight}g</div>
                         <div className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">Resterend</div>
                      </td>
                      <td className="px-8 py-4 text-right flex justify-end gap-2 items-center h-full pt-6">
                        <button 
                          onClick={() => { setEditingId(r.id); setFormData(r); setShowModal(true); }} 
                          className="p-2.5 border border-purple-600 text-purple-600 rounded-xl shadow-sm hover:bg-purple-600 hover:text-white appearance-none cursor-pointer transition-all active:scale-95"
                        >
                          <Edit3 size={16}/>
                        </button>
                        {r.status === 'actief' && (
                          <button 
                            onClick={() => onUpdate('filaments', r.id, {status: 'leeg'})} 
                            className="p-2.5 border border-slate-400 text-slate-500 rounded-xl shadow-sm hover:bg-slate-400 hover:text-white appearance-none cursor-pointer transition-all active:scale-95"
                          >
                            <Archive size={16}/>
                          </button>
                        )}
                        <button 
                          onClick={() => deleteItem('filaments', r.id)} 
                          className="p-2.5 border border-rose-400 text-rose-500 rounded-xl shadow-sm hover:bg-rose-500 hover:text-white appearance-none cursor-pointer transition-all active:scale-95"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && <Modal title={editingId ? "Rol Aanpassen" : "Nieuwe Voorraad"} onClose={() => { setShowModal(false); setEditingId(null); }}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Merk / Brand" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Materiaal (bijv. PLA)" value={formData.materialType} onChange={e => setFormData({...formData, materialType: e.target.value})} required />
            <Input label="Kleur Naam" value={formData.colorName} onChange={e => setFormData({...formData, colorName: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Totaal Gewicht (g)" type="number" value={formData.totalWeight} onChange={e => setFormData({...formData, totalWeight: e.target.value})} required />
            <Input label="Prijs per Rol (€)" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
          </div>
          <Input label="Winkel / Shop" value={formData.shop} onChange={e => setFormData({...formData, shop: e.target.value})} placeholder="Waar heb je dit gekocht?" />
          <div className="grid grid-cols-2 gap-4">
            {!editingId && <Input label="Aantal Rollen" type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-3 block tracking-widest font-black">Kleur Kiezen</label>
              <input type="color" className="w-full h-[54px] p-2 bg-slate-50 rounded-[1.5rem] border border-purple-100 shadow-inner cursor-pointer" value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase shadow-lg border-none appearance-none cursor-pointer italic hover:bg-purple-700 transition-all active:scale-[0.98]">
            {editingId ? 'Wijzigingen Opslaan' : 'Rollen Toevoegen'}
          </button>
        </form>
      </Modal>}
    </div>
  );
}

function SettingsPanel({ settings, onSave }) {
  const [temp, setTemp] = useState(settings);
  return (
    <div className="max-w-md bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-right-4 duration-500">
      <h2 className="text-2xl font-black italic uppercase text-purple-600 tracking-tighter">Instellingen</h2>
      <Input label="Stroomprijs p/kWh (€)" type="number" step="0.01" value={temp.kwhPrice} onChange={e => setTemp({...temp, kwhPrice: Number(e.target.value)})} />
      <Input label="Printer Verbruik (W)" type="number" value={temp.printerWattage} onChange={e => setTemp({...temp, printerWattage: Number(e.target.value)})} />
      <button 
        onClick={() => onSave(temp)} 
        className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black uppercase shadow-xl border-none appearance-none cursor-pointer italic hover:bg-purple-700 transition-all active:scale-[0.98]"
      >
        Instellingen Opslaan
      </button>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1 flex-1">
      <label className="text-[9px] font-black uppercase text-slate-600 ml-3 block tracking-widest font-black">{label}</label>
      <input {...props} className="w-full p-4 bg-slate-50 rounded-[1.5rem] border-none font-bold text-slate-900 shadow-inner outline-none focus:bg-slate-100 transition-all appearance-none" />
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh] border-none relative slide-in-from-bottom-4 animate-in duration-500">
        <div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">{title}</h2><button onClick={onClose} className="text-slate-400 hover:text-rose-500 border-none bg-transparent appearance-none cursor-pointer transition-all hover:rotate-90"><Plus size={32} className="rotate-45" /></button></div>
        {children}
      </div>
    </div>
  );
}