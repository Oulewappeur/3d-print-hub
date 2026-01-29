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
  Package, 
  Database, 
  ShoppingCart, 
  Plus, 
  Minus,
  Trash2, 
  Settings, 
  Printer, 
  Zap, 
  AlertTriangle, 
  LayoutDashboard, 
  TrendingUp, 
  Clock, 
  Euro, 
  Hash, 
  Archive, 
  RefreshCw, 
  CheckCircle2, 
  Edit3, 
  ChevronRight, 
  ChevronDown, 
  MessageCircle, 
  Upload, 
  Activity, 
  Scale,
  ListChecks,
  PlayCircle,
  Box,
  MessageSquare,
  Check,
  BarChart3,
  History,
  AlertCircle,
  Store
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

const appId = typeof __app_id !== 'undefined' ? __app_id : 'd-printer-orders-1b6f3';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TABS = {
  DASHBOARD: 'Dashboard',
  ORDERS: 'Bestellingen',
  CATALOG: 'Producten',
  STOCK: 'Filament Voorraad',
  SETTINGS: 'Instellingen'
};

const ORDER_STATUSES = ['In de wacht', 'Printen', 'Gereed', 'Afgerond'];

// Hulpmiddel om G-code metadata te parsen (Cura & Bambu)
const parseMetadataFromText = (text) => {
  const result = { time: 0, weight: 0, multiMaterial: [] };
  const timeMatch = text.match(/estimated printing time.*=\s*(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1] || 0);
    const mins = parseInt(timeMatch[2] || 0);
    result.time = (hours * 60) + mins;
  } else {
    const curaTimeMatch = text.match(/;TIME:(\d+)/i);
    if (curaTimeMatch) result.time = Math.round(parseInt(curaTimeMatch[1]) / 60);
  }
  const weightMatches = [...text.matchAll(/filament used \[g\]\s*=\s*([\d.]+)/gi)];
  if (weightMatches.length > 0) {
    result.weight = weightMatches.reduce((a, b) => a + parseFloat(b[1]), 0);
  } else {
    const curaFilamentMatch = text.match(/;Filament used:\s*([\d.]+)/i);
    if (curaFilamentMatch) result.weight = Math.round(parseFloat(curaFilamentMatch[1]) * 2.98); 
  }
  return result;
};

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
    if (!window.JSZip) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
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
    const getPath = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
    const unsubOrders = onSnapshot(query(getPath('orders')), (s) => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubProducts = onSnapshot(query(getPath('products')), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubFilaments = onSnapshot(query(getPath('filaments')), (s) => setFilaments(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), (s) => s.exists() && setSettings(s.data()));
    setLoading(false);
    return () => { unsubOrders(); unsubProducts(); unsubFilaments(); unsubSettings(); };
  }, [user]);

  const updateItem = async (coll, id, data) => { 
    if (!user) return; 
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', coll, id), data); 
  };
  const addItem = async (coll, data) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', coll), { ...data, createdAt: new Date().toISOString() });
  };
  const deleteItem = async (coll, id) => { 
    if (!user) return; 
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', coll, id)); 
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-purple-600 animate-pulse uppercase tracking-widest">Laden...</div>;

  return (
    <div className="min-h-screen bg-[#FDFCFE] flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">
      <nav className="w-full md:w-72 bg-white border-r border-slate-100 p-6 flex flex-col gap-2 z-20 shadow-sm overflow-y-auto">
        <div className="text-xl font-black text-purple-600 mb-10 flex items-center gap-3 px-2 italic text-balance">
          <div className="p-2 bg-purple-600 rounded-xl text-white shadow-md shadow-purple-100"><Printer size={20} strokeWidth={3} /></div>
          Rosevalley 3D Print Hub
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {Object.values(TABS).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              style={{ backgroundColor: activeTab === tab ? '#9333ea' : 'transparent' }}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all border-none outline-none focus:outline-none focus:ring-0 appearance-none select-none ${activeTab === tab ? 'text-white shadow-lg shadow-purple-200' : 'text-slate-500 hover:bg-purple-50 hover:text-purple-600 font-bold'}`}
            >
              <span className="text-sm font-bold uppercase tracking-tight">{tab}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen bg-[#FDFCFE]">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic underline decoration-purple-600 decoration-4 underline-offset-8">{activeTab}</h1>
        </header>

        {activeTab === TABS.DASHBOARD && <Dashboard orders={orders} products={products} filaments={filaments} settings={settings} />}
        {activeTab === TABS.ORDERS && <OrderList orders={orders} products={products} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />}
        {activeTab === TABS.CATALOG && <ProductList products={products} filaments={filaments} orders={orders} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} settings={settings} />}
        {activeTab === TABS.STOCK && <StockTable filaments={filaments} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />}
        {activeTab === TABS.SETTINGS && <SettingsPanel settings={settings} onSave={(d) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), d)} />}
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
    
    // Bereken actuele voorraad per soort (key) voor tekort-meldingen (op basis van resterende rol inhoud)
    filaments.forEach(f => {
      if (f.status === 'leeg') return;
      const key = `${f.brand}-${f.materialType}-${f.colorName}`;
      const remaining = (Number(f.totalWeight) || 0) - (Number(f.usedWeight) || 0);
      if (!filamentKeyStockRemaining[key]) filamentKeyStockRemaining[key] = 0;
      filamentKeyStockRemaining[key] += remaining;
    });

    const completedOrders = orders.filter(o => (o.items || []).every(i => i.status === 'Afgerond'));
    const readyOrders = orders.filter(o => (o.items || []).length > 0 && (o.items || []).every(i => i.status === 'Gereed'));
    const waitingOrders = orders.filter(o => (o.items || []).some(i => i.status === 'In de wacht'));

    // Gerealiseerde stats EN Verbruik historie (op basis van Bestellingen)
    completedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const itemRev = (Number(item.price) || 0) * (Number(item.quantity) || 0);
        revenue += itemRev;
        
        const p = products.find(prod => prod.id === item.productId);
        if (p) {
          // Kostenberekening
          const matCost = (p.filaments || []).reduce((s, f) => s + (f.weight * getFilamentGramPrice(filaments, f.key)), 0);
          const energy = (p.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
          const totalItemCost = (matCost + energy) * (Number(item.quantity) || 0);
          cost += totalItemCost;

          // Product prestaties
          if (!productStats[p.id]) productStats[p.id] = { name: p.name, revenue: 0, profit: 0, count: 0 };
          productStats[p.id].revenue += itemRev;
          productStats[p.id].profit += (itemRev - totalItemCost);
          productStats[p.id].count += Number(item.quantity) || 0;

          // Verbruikshistorie berekening op basis van producten in de bestelling
          if (p.filaments) {
            p.filaments.forEach(f => {
              const weightContribution = f.weight * (Number(item.quantity) || 0);
              totalConsumedWeight += weightContribution;
              if (!filamentConsumedBreakdown[f.key]) {
                filamentConsumedBreakdown[f.key] = { weight: 0, info: filaments.find(fil => `${fil.brand}-${fil.materialType}-${fil.colorName}` === f.key) };
              }
              filamentConsumedBreakdown[f.key].weight += weightContribution;
            });
          }
        }
      });
    });

    // Benodigd filament (ENKEL VOOR 'IN DE WACHT') & Prognose omzet
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.status !== 'Afgerond') {
          pendingRevenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
        }

        // Alleen meenemen voor 'In de wacht' items
        if (item.status === 'In de wacht') {
          const p = products.find(prod => prod.id === item.productId);
          if (p) {
            // Product breakdown voor "Nog te printen"
            if (!pendingProductsBreakdown[p.id]) {
              pendingProductsBreakdown[p.id] = { name: p.name, count: 0 };
            }
            pendingProductsBreakdown[p.id].count += (Number(item.quantity) || 0);

            if (p.filaments) {
              p.filaments.forEach(f => {
                const needed = (f.weight * (Number(item.quantity) || 0));
                if (!filamentNeeds[f.key]) filamentNeeds[f.key] = 0;
                filamentNeeds[f.key] += needed;
                totalNeededWeight += needed;
              });
            }
          }
        }
      });
    });

    return { 
      revenue, 
      profit: revenue - cost, 
      pendingRevenue,
      totalNeededWeight,
      totalConsumedWeight,
      waitingOrderCount: waitingOrders.length, 
      readyOrderCount: readyOrders.length,
      completedOrderCount: completedOrders.length,
      productStats: Object.values(productStats).sort((a,b) => b.revenue - a.revenue),
      pendingProductsBreakdown: Object.values(pendingProductsBreakdown).sort((a,b) => b.count - a.count),
      filamentNeeds: Object.entries(filamentNeeds).map(([key, weight]) => ({
        key,
        weight,
        isShortage: weight > (filamentKeyStockRemaining[key] || 0),
        info: filaments.find(f => `${f.brand}-${f.materialType}-${f.colorName}` === key)
      })).sort((a,b) => b.weight - a.weight),
      filamentConsumedBreakdown: Object.entries(filamentConsumedBreakdown).map(([key, data]) => ({
        key,
        weight: data.weight,
        info: data.info
      })).sort((a,b) => b.weight - a.weight)
    };
  }, [orders, products, filaments, settings]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
        <StatCard title="Gerealiseerde Omzet" value={`€${stats.revenue.toFixed(2)}`} color="text-purple-600" />
        <StatCard title="Gerealiseerde Winst" value={`€${stats.profit.toFixed(2)}`} color="text-emerald-600" />
        <StatCard title="Te Realiseren Omzet" value={`€${stats.pendingRevenue.toFixed(2)}`} color="text-blue-500" />
        <StatCard title="Totaal Verbruikt" value={`${Math.round(stats.totalConsumedWeight)}g`} color="text-slate-500" />
        <StatCard title="Bestellingen in de wacht" value={stats.waitingOrderCount} color="text-orange-500" />
        <StatCard title="Bestellingen Gereed" value={stats.readyOrderCount} color="text-emerald-500" />
        <StatCard title="Afgeronde Bestellingen" value={stats.completedOrderCount} color="text-slate-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
        {/* Product Prestaties */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><BarChart3 size={20}/></div>
             <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">Product Prestaties</h2>
          </div>
          <div className="overflow-hidden">
            <table className="w-full text-left">
               <thead className="text-[9px] uppercase font-black text-slate-300 border-b border-slate-50">
                 <tr><th className="pb-4">Product</th><th className="pb-4 text-center">Aantal</th><th className="pb-4 text-right">Winst</th></tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {stats.productStats.length === 0 ? (
                   <tr><td colSpan="3" className="py-8 text-center text-xs text-slate-300 italic font-bold">Nog geen data beschikbaar</td></tr>
                 ) : (
                   stats.productStats.slice(0, 5).map((ps, idx) => (
                    <tr key={idx}>
                      <td className="py-4 font-bold text-slate-700 text-sm">{ps.name}</td>
                      <td className="py-4 text-center font-black text-slate-400 text-xs">{ps.count}x</td>
                      <td className="py-4 text-right font-black text-emerald-500 text-sm">€{ps.profit.toFixed(2)}</td>
                    </tr>
                   ))
                 )}
               </tbody>
            </table>
          </div>
        </div>

        {/* Nog te printen producten */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Printer size={20}/></div>
             <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">Nog te printen</h2>
          </div>
          <div className="space-y-4 flex-1">
             {stats.pendingProductsBreakdown.length === 0 ? (
               <div className="py-8 text-center text-xs text-slate-300 italic font-bold">Geen producten in de wacht</div>
             ) : (
               stats.pendingProductsBreakdown.map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent">
                    <p className="text-xs font-bold text-slate-700">{item.name}</p>
                    <p className="text-sm font-black text-blue-600 italic">{item.count}x</p>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* Benodigd Filament */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><ShoppingCart size={20}/></div>
             <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">Benodigd Filament</h2>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto">
             {stats.filamentNeeds.length === 0 ? (
               <div className="py-8 text-center text-xs text-slate-300 italic font-bold">Geen filament nodig</div>
             ) : (
               stats.filamentNeeds.map((need, idx) => (
                 <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${need.isShortage ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-transparent'}`}>
                    <div className="flex items-center gap-3">
                       <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: need.info?.colorCode || '#ccc' }}></div>
                       <div>
                          <p className={`text-xs font-bold ${need.isShortage ? 'text-orange-700' : 'text-slate-700'}`}>{need.info ? `${need.info.brand} ${need.info.materialType}` : 'Onbekend'}</p>
                          <p className="text-[9px] font-black uppercase text-slate-400">{need.info?.colorName || need.key}</p>
                       </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                       {need.isShortage && <div className="text-orange-500 animate-pulse"><AlertCircle size={14}/></div>}
                       <p className={`text-sm font-black italic ${need.isShortage ? 'text-orange-600' : 'text-slate-600'}`}>{Math.round(need.weight)}g</p>
                    </div>
                 </div>
               ))
             )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
            <div className="px-4 py-2 bg-purple-50 text-purple-600 rounded-2xl text-[10px] font-black uppercase">
               Totaal: {Math.round(stats.totalNeededWeight)}g
             </div>
          </div>
        </div>

        {/* Verbruik Historie */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><History size={20}/></div>
             <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">Verbruik Historie</h2>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto">
             {stats.filamentConsumedBreakdown.length === 0 ? (
               <div className="py-8 text-center text-xs text-slate-300 italic font-bold">Geen verbruikshistorie</div>
             ) : (
               stats.filamentConsumedBreakdown.slice(0, 6).map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl group hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: item.info?.colorCode || '#ccc' }}></div>
                       <div>
                          <p className="text-xs font-bold text-slate-600">{item.info?.brand || 'Onbekend'} {item.info?.materialType || ''}</p>
                          <p className="text-[9px] font-black uppercase text-slate-300">{item.info?.colorName || item.key}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-slate-400 italic group-hover:text-purple-600 transition-colors">{Math.round(item.weight)}g</p>
                    </div>
                 </div>
               ))
             )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
            <div className="px-4 py-2 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase">
               Totaal: {Math.round(stats.totalConsumedWeight / 1000)}kg
             </div>
          </div>
        </div>
      </div>
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

function OrderList({ orders, products, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [formData, setFormData] = useState({ 
    customer: '', 
    messengerLink: '', 
    orderDate: new Date().toISOString().split('T')[0], 
    orderTime: new Date().toTimeString().slice(0,5),
    items: [{ productId: '', quantity: 1, price: '', status: 'In de wacht' }],
    comments: '' 
  });

  const grouped = useMemo(() => {
    const active = [];
    const ready = [];
    const completed = [];
    
    orders.forEach(o => {
      const items = o.items || [];
      const allCompleted = items.length > 0 && items.every(i => i.status === 'Afgerond');
      const allReady = items.length > 0 && items.every(i => i.status === 'Gereed');
      
      if (allCompleted) {
        completed.push(o);
      } else if (allReady) {
        ready.push(o);
      } else {
        active.push(o);
      }
    });
    return { active, ready, completed };
  }, [orders]);

  const handleSubmit = (e) => {
    e.preventDefault();
    editingId ? onUpdate('orders', editingId, formData) : onAdd('orders', formData);
    setShowModal(false);
    setEditingId(null);
  };

  const handleQuickStatusUpdate = (orderId, itemIndex, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newItems = [...order.items];
    newItems[itemIndex].status = newStatus;
    onUpdate('orders', orderId, { items: newItems });
  };

  const handleQuickCommentUpdate = (orderId, newComment) => {
    onUpdate('orders', orderId, { comments: newComment });
  };

  const OrderTable = ({ list, title, isCompletedSection = false, isReadySection = false }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4">
        <div className={`p-1.5 rounded-lg ${isReadySection ? 'bg-emerald-100 text-emerald-600' : isCompletedSection ? 'bg-slate-100 text-slate-400' : 'bg-purple-100 text-purple-600'}`}>
          {isReadySection ? <Check size={14} strokeWidth={3} /> : isCompletedSection ? <Archive size={14} /> : <ListChecks size={14} />}
        </div>
        <h2 className={`text-sm font-black uppercase tracking-widest ${isReadySection ? 'text-emerald-500' : 'text-slate-400'}`}>
          {title} ({list.length})
        </h2>
      </div>
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-slate-400 text-[9px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr><th className="px-8 py-4">Klant / Tijd</th><th className="px-8 py-4">Items & Status</th><th className="px-8 py-4">Bedrag</th><th className="px-8 py-4">Snel-notitie</th><th className="px-8 py-4 text-right">Beheer</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {list.sort((a,b) => {
              const dateA = new Date(`${a.orderDate}T${a.orderTime || '00:00'}`);
              const dateB = new Date(`${b.orderDate}T${b.orderTime || '00:00'}`);
              return isCompletedSection ? dateB - dateA : dateA - dateB;
            }).map(o => (
              <tr key={o.id} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800">{o.customer}</p>
                    {o.messengerLink && <a href={o.messengerLink} target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-600"><MessageCircle size={14}/></a>}
                  </div>
                  <p className="text-[9px] text-slate-400 uppercase font-black">{o.orderDate} om {o.orderTime || '--:--'}</p>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-col gap-2">
                    {(o.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase shrink-0 ${item.status === 'Afgerond' ? 'bg-slate-100 text-slate-400' : item.status === 'Gereed' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                          {item.quantity}x {products.find(p => p.id === item.productId)?.name || '?'}
                        </span>
                        {!isCompletedSection && (
                          <select 
                            className={`bg-transparent border-none text-[9px] font-black uppercase cursor-pointer outline-none appearance-none ${item.status === 'Gereed' ? 'text-emerald-500' : 'text-slate-400'} hover:text-purple-600 transition-colors`}
                            value={item.status}
                            onChange={(e) => handleQuickStatusUpdate(o.id, idx, e.target.value)}
                          >
                            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                        {isCompletedSection && <span className="text-[9px] font-black uppercase text-slate-300 italic">{item.status}</span>}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-8 py-5 font-black text-slate-900 text-sm italic">
                  €{(o.items || []).reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0).toFixed(2)}
                </td>
                <td className="px-8 py-5">
                  <div className="relative group/note max-w-[150px]">
                    <input 
                      type="text" 
                      defaultValue={o.comments || ''} 
                      onBlur={(e) => handleQuickCommentUpdate(o.id, e.target.value)}
                      placeholder="Typ notitie..."
                      className="w-full bg-slate-50 border-none rounded-lg p-2 text-[10px] font-bold text-slate-600 outline-none focus:bg-white focus:ring-1 focus:ring-purple-200 transition-all italic"
                    />
                  </div>
                </td>
                <td className="px-8 py-5 text-right flex justify-end gap-1">
                  <button onClick={() => { setEditingId(o.id); setFormData(o); setShowModal(true); }} className="p-2 text-slate-300 hover:text-purple-600 border-none bg-transparent outline-none cursor-pointer"><Edit3 size={16}/></button>
                  <button onClick={() => onDelete('orders', o.id)} className="p-2 text-slate-300 hover:text-rose-500 border-none bg-transparent outline-none cursor-pointer"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
      <button 
        onClick={() => { setEditingId(null); setFormData({ customer: '', messengerLink: '', orderDate: new Date().toISOString().split('T')[0], orderTime: new Date().toTimeString().slice(0,5), items: [{ productId: '', quantity: 1, price: '', status: 'In de wacht' }], comments: '' }); setShowModal(true); }} 
        style={{ backgroundColor: '#9333ea' }}
        className="text-white px-10 py-4 rounded-2xl font-black uppercase italic shadow-xl hover:scale-105 transition-all border-none focus:outline-none cursor-pointer"
      >
        <Plus size={18} className="inline mr-2" strokeWidth={3} /> Bestelling Invoeren
      </button>

      <OrderTable list={grouped.active} title="Lopende Bestellingen" />

      {grouped.ready.length > 0 && (
        <div className="pt-4">
          <OrderTable list={grouped.ready} title="Gereed voor Afhalen" isReadySection={true} />
        </div>
      )}

      {grouped.completed.length > 0 && (
        <div className="space-y-4 pt-10">
          <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 border-none bg-transparent cursor-pointer hover:text-purple-600 transition-colors">
            {showCompleted ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
            {showCompleted ? 'Verberg' : 'Toon'} Afgeronde Bestellingen
          </button>
          {showCompleted && <OrderTable list={grouped.completed} title="Archief" isCompletedSection={true} />}
        </div>
      )}

      {showModal && <Modal title={editingId ? "Bestelling Aanpassen" : "Nieuwe Bestelling"} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Klant Naam" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bestel Datum" type="date" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} required />
            <Input label="Bestel Tijd" type="time" value={formData.orderTime} onChange={e => setFormData({...formData, orderTime: e.target.value})} required />
          </div>
          <Input label="Chat Link" value={formData.messengerLink} onChange={e => setFormData({...formData, messengerLink: e.target.value})} />
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-3 block tracking-widest font-black">Commentaar / Notitie</label>
            <textarea 
              className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold text-slate-700 shadow-inner outline-none focus:bg-slate-100 transition-all appearance-none resize-none h-24"
              value={formData.comments}
              onChange={e => setFormData({...formData, comments: e.target.value})}
              placeholder="Bijv: Afhaalbericht verstuurd op 12-01..."
            />
          </div>
          <div className="space-y-3">
             <div className="flex justify-between items-center px-2"><label className="text-[9px] font-black uppercase text-slate-400">Producten</label><button type="button" onClick={() => setFormData({...formData, items: [...formData.items, {productId: '', quantity: 1, price: '', status: 'In de wacht'}]})} className="text-purple-600 text-[9px] font-black uppercase border-none bg-transparent cursor-pointer font-black">+ Item</button></div>
             <div className="space-y-3 bg-slate-50 p-4 rounded-2xl max-h-80 overflow-y-auto shadow-inner">
               {formData.items.map((it, idx) => (
                 <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 relative shadow-sm">
                   {formData.items.length > 1 && <button type="button" onClick={() => setFormData({...formData, items: formData.items.filter((_, i) => i !== idx)})} className="absolute top-1 right-1 text-slate-200 hover:text-rose-500 border-none bg-transparent"><Minus size={14}/></button>}
                   <select required className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold border-none appearance-none outline-none" value={it.productId} onChange={e => {
                     const newItems = [...formData.items]; 
                     newItems[idx].productId = e.target.value;
                     const p = products.find(prod => prod.id === e.target.value);
                     if (p) newItems[idx].price = p.suggestedPrice || '';
                     setFormData({...formData, items: newItems});
                   }}>
                     <option value="">Product...</option>
                     {products.filter(p => p.status !== 'gearchiveerd').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <div className="grid grid-cols-2 gap-2">
                     <input type="number" className="p-2 bg-slate-50 rounded-lg text-xs font-black border-none outline-none" value={it.quantity} onChange={e => {const ni = [...formData.items]; ni[idx].quantity = e.target.value; setFormData({...formData, items: ni});}} placeholder="Aantal" />
                     <input type="number" step="0.01" className="p-2 bg-slate-50 rounded-lg text-xs font-black border-none outline-none" value={it.price} onChange={e => {const ni = [...formData.items]; ni[idx].price = e.target.value; setFormData({...formData, items: ni});}} placeholder="Prijs" />
                   </div>
                   <select className="w-full p-2 bg-slate-50 rounded-lg text-[9px] font-black uppercase border-none text-purple-600 appearance-none outline-none" value={it.status} onChange={e => {const ni = [...formData.items]; ni[idx].status = e.target.value; setFormData({...formData, items: ni});}}>
                     {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                 </div>
               ))}
             </div>
          </div>
          <button type="submit" style={{ backgroundColor: '#9333ea' }} className="w-full py-4 text-white rounded-2xl font-black uppercase shadow-lg border-none cursor-pointer italic transition-all hover:bg-purple-700">Bestelling Opslaan</button>
        </form>
      </Modal>}
    </div>
  );
}

function ProductList({ products, filaments, orders, onAdd, onUpdate, onDelete, settings }) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [archived, setArchived] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [formData, setFormData] = useState({ name: '', filaments: [], suggestedPrice: '', timeH: 0, timeM: 0 });
  const fileInputRef = useRef(null);

  const netStockData = useMemo(() => {
    const data = {};
    products.forEach(p => {
      let reserved = 0;
      orders.forEach(o => {
        (o.items || []).forEach(item => {
          if (item.productId === p.id && (item.status === 'In de wacht' || item.status === 'Printen')) {
            reserved += Number(item.quantity) || 0;
          }
        });
      });
      data[p.id] = (p.stockQuantity || 0) - reserved;
    });
    return data;
  }, [products, orders]);

  const uniqueFilamentTypes = useMemo(() => {
    const types = {};
    filaments.forEach(f => {
      const key = `${f.brand}-${f.materialType}-${f.colorName}`;
      if (!types[key]) types[key] = { 
        key, 
        color: f.colorCode, 
        brand: f.brand, 
        materialType: f.materialType, 
        colorName: f.colorName 
      };
    });
    return Object.values(types);
  }, [filaments]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true);
    try {
      const is3MF = file.name.toLowerCase().endsWith('.3mf');
      let content = "";
      if (is3MF) {
        const zip = await window.JSZip.loadAsync(file);
        const gcodeFile = Object.keys(zip.files).find(name => name.endsWith('.gcode'));
        if (gcodeFile) content = await zip.files[gcodeFile].async("string");
      } else {
        const reader = new FileReader();
        content = await new Promise((res) => { reader.onload = (ev) => res(ev.target.result); reader.readAsText(file); });
      }
      if (content) {
        const meta = parseMetadataFromText(content);
        setFormData(prev => ({ ...prev, timeH: Math.floor(meta.time / 60), timeM: meta.time % 60 }));
      }
    } catch (err) { console.error(err); } finally { setParsing(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button 
          onClick={() => { setEditingId(null); setFormData({name:'', filaments:[], suggestedPrice:'', timeH:0, timeM:0}); setShowModal(true); }} 
          style={{ backgroundColor: '#9333ea' }}
          className="text-white px-10 py-4 rounded-2xl font-black uppercase italic shadow-lg border-none cursor-pointer transition-all hover:bg-purple-700"
        >
          <Plus size={18} className="inline mr-2" strokeWidth={3} /> Nieuw Product
        </button>
        <button onClick={() => setArchived(!archived)} className="text-[10px] font-black uppercase text-slate-400 border-none bg-transparent cursor-pointer hover:text-purple-600 transition-colors">
          <Archive size={14} className="inline mr-1" /> {archived ? 'Toon Actief' : 'Toon Archief'}
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-slate-400 text-[9px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr><th className="px-8 py-4">Product</th><th className="px-8 py-4 text-center">Voorraad</th><th className="px-8 py-4 text-center">Netto</th><th className="px-8 py-4 text-right">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {products.filter(p => archived ? p.status === 'gearchiveerd' : p.status !== 'gearchiveerd').map(p => {
              const isEx = expanded[p.id];
              const net = netStockData[p.id];
              const matCost = (p.filaments || []).reduce((s, f) => s + (f.weight * getFilamentGramPrice(filaments, f.key)), 0);
              const energy = (p.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
              
              return (
                <React.Fragment key={p.id}>
                  <tr onClick={() => setExpanded({...expanded, [p.id]: !isEx})} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <div className="flex gap-1 mt-1">
                        {(p.filaments || []).map(f => (
                          <div key={f.key} className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: filaments.find(fil => `${fil.brand}-${fil.materialType}-${fil.colorName}` === f.key)?.colorCode }}></div>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); onUpdate('products', p.id, {stockQuantity: (p.stockQuantity || 0) - 1}); }} className="p-1.5 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-lg border-none cursor-pointer"><Minus size={14}/></button>
                        <p className="font-black text-slate-700 w-8 text-center">{p.stockQuantity || 0}</p>
                        <button onClick={(e) => { e.stopPropagation(); onUpdate('products', p.id, {stockQuantity: (p.stockQuantity || 0) + 1}); }} className="p-1.5 bg-slate-50 text-slate-400 hover:text-emerald-500 rounded-lg border-none cursor-pointer"><Plus size={14}/></button>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <p className={`font-black italic text-lg ${net < 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>{net}</p>
                    </td>
                    <td className="px-8 py-5 text-right text-slate-300">{isEx ? <ChevronDown size={20} className="text-purple-600"/> : <ChevronRight size={20}/>}</td>
                  </tr>
                  {isEx && (
                    <tr className="bg-slate-50/30 border-l-4 border-purple-500">
                      <td colSpan="4" className="px-12 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-2 font-black">Details</p>
                            <p className="text-xs font-bold text-slate-600 italic">Tijd: {Math.floor(p.printTime / 60)}u {p.printTime % 60}m</p>
                            <p className="text-xs font-bold text-slate-600 italic">Gewicht: {p.weight}g</p>
                            <div className="mt-4 flex gap-2">
                              <button onClick={() => { setEditingId(p.id); setFormData({name: p.name, filaments: p.filaments || [], suggestedPrice: p.suggestedPrice || '', timeH: Math.floor(p.printTime / 60), timeM: p.printTime % 60}); setShowModal(true); }} className="p-2 bg-white rounded-xl text-purple-600 shadow-sm border border-slate-100 hover:bg-purple-50 transition-all"><Edit3 size={16}/></button>
                              <button onClick={() => onUpdate('products', p.id, {status: archived ? 'actief' : 'gearchiveerd'})} className="p-2 bg-white rounded-xl text-slate-400 shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">{archived ? <RefreshCw size={16}/> : <Archive size={16}/>}</button>
                              <button onClick={() => onDelete('products', p.id)} className="p-2 bg-white rounded-xl text-rose-300 shadow-sm border border-slate-100 hover:text-rose-600 hover:bg-rose-50 transition-all"><Trash2 size={16}/></button>
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-2 font-black">Kostprijs</p>
                            <p className="text-xl font-black italic text-slate-600">€{(matCost + energy).toFixed(2)}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 font-black">Mat: €{matCost.toFixed(2)} • Stroom: €{energy.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-2 font-black">Verkoopprijs</p>
                            <p className="text-xl font-black italic text-purple-600">€{(p.suggestedPrice || 0).toFixed(2)}</p>
                            <p className="text-[9px] text-emerald-500 font-black uppercase mt-1 font-black">Marge: €{(p.suggestedPrice - (matCost + energy)).toFixed(2)}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && <Modal title={editingId ? "Product Bewerken" : "Nieuw Product"} onClose={() => setShowModal(false)}>
        <div className="mb-6 p-6 bg-purple-50 rounded-3xl border border-dashed border-purple-200 text-center">
          <input type="file" accept=".gcode,.3mf" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 w-full text-purple-600 border-none bg-transparent cursor-pointer font-black">
            {parsing ? <RefreshCw className="animate-spin" /> : <Upload size={24} />}
            <p className="text-[9px] font-black uppercase tracking-widest">{parsing ? "Laden..." : "Importeer G-code / 3MF"}</p>
          </button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const final = { name: formData.name, filaments: formData.filaments, printTime: (Number(formData.timeH) * 60) + Number(formData.timeM), suggestedPrice: Number(formData.suggestedPrice), weight: formData.filaments.reduce((s,f) => s + Number(f.weight), 0) };
          editingId ? onUpdate('products', editingId, final) : onAdd('products', {...final, stockQuantity: 0, status: 'actief'});
          setShowModal(false);
        }} className="space-y-6">
          <Input label="Naam" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Uren" type="number" value={formData.timeH} onChange={e => setFormData({...formData, timeH: e.target.value})} />
            <Input label="Minuten" type="number" value={formData.timeM} onChange={e => setFormData({...formData, timeM: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-400">Filamenten</label>
            <div className="bg-slate-50 p-4 rounded-2xl max-h-48 overflow-y-auto space-y-2 shadow-inner">
              {uniqueFilamentTypes.map(type => {
                const assign = formData.filaments.find(f => f.key === type.key);
                return (
                  <div key={type.key} className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, filaments: assign ? formData.filaments.filter(f => f.key !== type.key) : [...formData.filaments, {key: type.key, weight: 0}]})} 
                      style={{ backgroundColor: assign ? '#9333ea' : '#fff' }}
                      className={`flex-1 p-3 rounded-xl text-[9px] font-black uppercase flex items-center gap-3 border-none cursor-pointer transition-all ${assign ? 'text-white shadow-md' : 'text-slate-400 font-bold'}`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{backgroundColor: type.color}}></div> 
                      {type.brand} {type.materialType} {type.colorName}
                    </button>
                    {assign && <input type="number" className="w-16 p-2 bg-white rounded-lg text-[10px] font-black border-none outline-none shadow-sm" placeholder="G" value={assign.weight} onChange={e => setFormData({...formData, filaments: formData.filaments.map(f => f.key === type.key ? {...f, weight: Number(e.target.value)} : f)})} />}
                  </div>
                );
              })}
            </div>
          </div>
          <Input label="Verkoopprijs (€)" type="number" step="0.01" value={formData.suggestedPrice} onChange={e => setFormData({...formData, suggestedPrice: e.target.value})} required />
          <button type="submit" style={{ backgroundColor: '#9333ea' }} className="w-full py-4 text-white rounded-2xl font-black uppercase shadow-lg border-none cursor-pointer italic transition-all hover:bg-purple-700">Product Opslaan</button>
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
  const [formData, setFormData] = useState({ brand: '', materialType: 'PLA', colorName: '', colorCode: '#9333ea', totalWeight: 1000, price: '', purchaseDate: new Date().toISOString().split('T')[0], shop: '', quantity: 1 });

  const grouped = useMemo(() => {
    const res = {};
    filaments.filter(f => archived ? f.status === 'leeg' : f.status !== 'leeg').forEach(f => {
      const k = `${f.brand}-${f.materialType}-${f.colorName}`;
      if (!res[k]) res[k] = { ...f, rolls: [] };
      res[k].rolls.push(f);
    });
    return Object.values(res);
  }, [filaments, archived]);

  const handleEditClick = (rol) => {
    setEditingId(rol.id);
    setFormData({
      brand: rol.brand || '',
      materialType: rol.materialType || 'PLA',
      colorName: rol.colorName || '',
      colorCode: rol.colorCode || '#9333ea',
      totalWeight: rol.totalWeight || 1000,
      price: rol.price || '',
      purchaseDate: rol.purchaseDate || new Date().toISOString().split('T')[0],
      shop: rol.shop || '',
      quantity: 1,
      usedWeight: rol.usedWeight || 0
    });
    setShowModal(true);
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
          style={{ backgroundColor: '#9333ea' }}
          className="text-white px-10 py-4 rounded-2xl font-black uppercase italic shadow-lg border-none cursor-pointer transition-all hover:bg-purple-700"
        >
          + Rol Toevoegen
        </button>
        <button onClick={() => setArchived(!archived)} className="text-[10px] font-black uppercase text-slate-400 border-none bg-transparent cursor-pointer hover:text-purple-600 transition-colors">
          {archived ? 'Toon Actief' : 'Toon Leeg'}
        </button>
      </div>
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-slate-400 text-[9px] uppercase font-black border-b border-slate-100">
            <tr><th className="px-8 py-4">Kleur</th><th className="px-8 py-4">Naam</th><th className="px-8 py-4">Voorraad</th><th className="px-8 py-4 text-right">Beheer</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {grouped.map(g => {
              const k = `${g.brand}-${g.materialType}-${g.colorName}`;
              const isEx = expanded[k];
              const total = g.rolls.reduce((s, r) => s + (r.totalWeight - (r.usedWeight || 0)), 0);
              return (
                <React.Fragment key={k}>
                  <tr onClick={() => setExpanded({...expanded, [k]: !isEx})} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                    <td className="px-8 py-5"><div className="w-8 h-8 rounded-xl shadow-inner border border-slate-100" style={{backgroundColor: g.colorCode}}></div></td>
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-800">{g.brand} {g.materialType}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-black">{g.colorName}</p>
                    </td>
                    <td className="px-8 py-5 font-black text-slate-700 italic text-lg">{Math.round(total)}g</td>
                    <td className="px-8 py-5 text-right text-slate-300">{isEx ? <ChevronDown size={22} className="text-purple-600"/> : <ChevronRight size={22}/>}</td>
                  </tr>
                  {isEx && g.rolls.map(r => (
                    <tr key={r.id} className="bg-slate-50/30 border-l-4 border-purple-500">
                      <td colSpan="2" className="px-10 py-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-[9px] font-black uppercase text-slate-400 font-black">Rol #{r.id.slice(-4)} ({r.status})</p>
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-slate-500 font-bold italic">Sinds: {r.purchaseDate}</p>
                            {r.shop && <p className="text-[9px] bg-white px-2 py-0.5 rounded-lg border border-slate-100 text-purple-600 font-black uppercase italic"><Store size={8} className="inline mr-1 mb-0.5" /> {r.shop}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 font-black text-slate-600 italic">{Math.round(r.totalWeight - (r.usedWeight || 0))}g / {r.totalWeight}g</td>
                      <td className="px-8 py-4 text-right flex justify-end gap-2">
                        <div className="flex bg-white rounded-lg border border-slate-200 p-1 px-3 items-center shadow-sm">
                          <Hash size={12} className="text-purple-500 mr-2" />
                          <input type="number" placeholder="+/- G" className="w-12 text-[10px] font-bold outline-none border-none p-0 bg-transparent" onKeyDown={e => e.key === 'Enter' && (onUpdate('filaments', r.id, {usedWeight: Math.max(0, (r.usedWeight || 0) + Number(e.target.value))}), e.target.value = '')} />
                        </div>
                        <button onClick={() => handleEditClick(r)} className="p-2 bg-white rounded-xl text-slate-400 hover:text-purple-600 border-none cursor-pointer shadow-sm"><Edit3 size={16}/></button>
                        <button onClick={() => onUpdate('filaments', r.id, {status: r.status === 'actief' ? 'voorraad' : 'actief'})} className={`p-2 rounded-xl transition-all border-none ${r.status === 'actief' ? 'bg-emerald-50 text-emerald-500' : 'bg-white text-slate-300'} cursor-pointer shadow-sm`} title="Toggelt Actief"><Zap size={16}/></button>
                        <button onClick={() => onUpdate('filaments', r.id, {status: 'leeg'})} className="p-2 bg-white rounded-xl text-slate-300 hover:text-rose-500 border-none cursor-pointer shadow-sm"><Archive size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {showModal && <Modal title={editingId ? "Rol Aanpassen" : "Filament Toevoegen"} onClose={() => setShowModal(false)}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const { quantity, ...data } = formData;
          if (editingId) {
            onUpdate('filaments', editingId, { ...data, price: Number(data.price), totalWeight: Number(data.totalWeight) });
          } else {
            for(let i=0; i<quantity; i++) onAdd('filaments', {...data, usedWeight: 0, status: 'voorraad', price: Number(data.price), totalWeight: Number(data.totalWeight)});
          }
          setShowModal(false);
        }} className="space-y-6">
          <div className="grid grid-cols-2 gap-4"><Input label="Merk" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} required /><Input label="Type" value={formData.materialType} onChange={e => setFormData({...formData, materialType: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4"><Input label="Kleur" value={formData.colorName} onChange={e => setFormData({...formData, colorName: e.target.value})} required /><div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest font-black">Visueel</label><input type="color" className="w-full h-12 p-1 bg-slate-50 rounded-2xl border-none cursor-pointer shadow-inner appearance-none outline-none" value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} /></div></div>
          <div className="grid grid-cols-2 gap-4"><Input label="Winkel" value={formData.shop} onChange={e => setFormData({...formData, shop: e.target.value})} placeholder="Bijv: 123-3D" /><Input label="Koop Datum" type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4"><Input label="Prijs" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required /><Input label="Totaal (g)" type="number" value={formData.totalWeight} onChange={e => setFormData({...formData, totalWeight: e.target.value})} required /></div>
          {!editingId && <Input label="Aantal rollen" type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />}
          <button type="submit" style={{ backgroundColor: '#9333ea' }} className="w-full py-4 text-white rounded-2xl font-black uppercase shadow-lg border-none cursor-pointer italic transition-all hover:bg-purple-700">{editingId ? 'Rol Bijwerken' : 'In Voorraad Plaatsen'}</button>
        </form>
      </Modal>}
    </div>
  );
}

function SettingsPanel({ settings, onSave }) {
  const [temp, setTemp] = useState(settings);
  return (
    <div className="max-w-md bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-right-4">
      <h2 className="text-2xl font-black italic uppercase text-purple-600 tracking-tighter">Configuratie</h2>
      <Input label="Prijs p/kWh (€)" type="number" step="0.01" value={temp.kwhPrice} onChange={e => setTemp({...temp, kwhPrice: Number(e.target.value)})} />
      <Input label="Printer Verbruik (W)" type="number" value={temp.printerWattage} onChange={e => setTemp({...temp, printerWattage: Number(e.target.value)})} />
      <button onClick={() => onSave(temp)} style={{ backgroundColor: '#9333ea' }} className="w-full py-5 text-white rounded-2xl font-black uppercase shadow-xl transition-all border-none cursor-pointer italic hover:bg-purple-700">Instellingen Opslaan</button>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1 flex-1">
      <label className="text-[9px] font-black uppercase text-slate-400 ml-3 block tracking-wider font-black tracking-widest">{label}</label>
      <input {...props} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-bold text-slate-700 shadow-inner outline-none focus:bg-slate-100 transition-all appearance-none" />
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh] border border-white relative slide-in-from-bottom-4 animate-in duration-500">
        <div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">{title}</h2><button onClick={onClose} className="text-slate-200 hover:text-rose-500 border-none bg-transparent cursor-pointer"><Plus size={32} className="rotate-45" /></button></div>
        {children}
      </div>
    </div>
  );
}