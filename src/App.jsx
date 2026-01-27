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
  ExternalLink, 
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
  Calendar,
  Copy,
  Edit3,
  Store,
  ChevronRight,
  ChevronDown,
  Layers,
  Search,
  MessageCircle,
  FileCode,
  Upload,
  Activity,
  Box,
  PlayCircle,
  Scale,
  Calculator
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

// Hulpmiddel om G-code metadata te parsen (nu ook voor Bambu Studio 3MF)
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
    if (weightMatches.length > 1) {
      result.multiMaterial = weightMatches.map(m => parseFloat(m[1]));
      result.weight = result.multiMaterial.reduce((a, b) => a + b, 0);
    } else {
      result.weight = parseFloat(weightMatches[0][1]);
    }
  } else {
    const curaFilamentMatch = text.match(/;Filament used:\s*([\d.]+)/i);
    if (curaFilamentMatch) result.weight = Math.round(parseFloat(curaFilamentMatch[1]) * 2.98);
  }
  return result;
};

// Bereken actuele filamentprijs per gram voor een type
const getFilamentGramPrice = (filaments, key) => {
  const activeRolls = filaments.filter(f => f.status === 'actief' && `${f.brand}-${f.materialType}-${f.colorName}` === key);
  const targetRoll = activeRolls.length > 0 ? activeRolls[0] : filaments.find(f => `${f.brand}-${f.materialType}-${f.colorName}` === key);
  
  if (targetRoll && targetRoll.price && targetRoll.totalWeight) {
    return targetRoll.price / targetRoll.totalWeight;
  }
  return 0;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [filaments, setFilaments] = useState([]);
  const [settings, setSettings] = useState({ kwhPrice: 0.35, printerWattage: 150 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!window.JSZip) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setErrorMessage("Verbinding met Firebase mislukt.");
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const getPath = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);

    const unsubOrders = onSnapshot(query(getPath('orders')), 
      (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
        setErrorMessage(null);
      }, 
      (err) => {
        console.error("Orders Error:", err);
        setErrorMessage("Toegang geweigerd voor bestellingen.");
        setLoading(false);
      }
    );

    const unsubProducts = onSnapshot(query(getPath('products')), 
      (snapshot) => setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (err) => console.error("Products Error:", err)
    );

    const unsubFilaments = onSnapshot(query(getPath('filaments')), 
      (snapshot) => setFilaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (err) => console.error("Filaments Error:", err)
    );

    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), 
      (docSnap) => {
        if (docSnap.exists()) setSettings(docSnap.data());
      }, 
      (err) => console.error("Settings Error:", err)
    );

    return () => { 
      unsubOrders(); 
      unsubProducts(); 
      unsubFilaments(); 
      unsubSettings(); 
    };
  }, [user]);

  const addItem = async (coll, data) => {
    if (!user) return;
    try {
      if (coll === 'filaments' && data.quantity > 1) {
        const { quantity, ...singleData } = data;
        for (let i = 0; i < quantity; i++) {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', coll), { 
            ...singleData, 
            status: 'voorraad', 
            createdAt: new Date().toISOString() 
          });
        }
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', coll), { 
          ...data, 
          status: data.status || 'actief', 
          createdAt: new Date().toISOString() 
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateItem = async (coll, id, data) => { 
    if (!user) return; 
    try { 
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', coll, id), data); 
    } catch (e) { console.error(e); } 
  };

  const deleteItem = async (coll, id) => { 
    if (!user) return; 
    try { 
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', coll, id)); 
    } catch (e) { console.error(e); } 
  };

  const saveSettings = async (data) => { 
    if (!user) return; 
    try { 
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), data); 
    } catch (e) { console.error(e); } 
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white font-sans">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Authenticeren...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFE] flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">
      <nav className="w-full md:w-72 bg-white border-r border-slate-100 p-6 flex flex-col gap-2 z-20 shadow-sm overflow-y-auto">
        <div className="text-xl font-black text-purple-600 mb-10 flex items-center gap-3 px-2">
          <div className="p-2 bg-purple-600 rounded-xl text-white shadow-md shadow-purple-100">
            <Printer size={20} strokeWidth={3} />
          </div>
          3D Hub
        </div>
        
        <div className="flex flex-col gap-2 flex-1">
          {Object.values(TABS).map(tab => {
            const isActive = activeTab === tab;
            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300 border-none outline-none ring-0 appearance-none select-none ${
                  isActive ? 'text-white font-bold' : 'text-slate-500 hover:bg-purple-50 hover:text-purple-600'
                }`}
                style={{ 
                  backgroundColor: isActive ? '#9333ea' : 'transparent',
                  color: isActive ? '#ffffff' : undefined,
                  boxShadow: isActive ? '0 10px 25px -5px rgba(147, 51, 234, 0.3)' : 'none',
                  border: 'none',
                  outline: 'none'
                }}
              >
                {tab === TABS.DASHBOARD && <LayoutDashboard size={18} />}
                {tab === TABS.ORDERS && <ShoppingCart size={18} />}
                {tab === TABS.CATALOG && <Package size={18} />}
                {tab === TABS.STOCK && <Database size={18} />}
                {tab === TABS.SETTINGS && <Settings size={18} />}
                <span className="text-sm font-bold tracking-tight">{tab}</span>
              </button>
            );
          })}
        </div>
        
        {errorMessage && (
          <div className="mt-auto p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-bold flex flex-col gap-2">
            <div className="flex items-start gap-2">
               <AlertTriangle size={14} className="shrink-0 mt-0.5" />
               <span>Systeemmelding</span>
            </div>
            <p className="font-medium opacity-80">{errorMessage}</p>
          </div>
        )}
      </nav>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen bg-[#FDFCFE]">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{activeTab}</h1>
            <div className="h-1.5 w-16 bg-purple-600 mt-2 rounded-full shadow-sm"></div>
          </div>
        </header>

        {activeTab === TABS.DASHBOARD && <Dashboard orders={orders} products={products} filaments={filaments} settings={settings} />}
        {activeTab === TABS.ORDERS && <OrderList orders={orders} products={products} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />}
        {activeTab === TABS.CATALOG && <ProductList products={products} filaments={filaments} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} settings={settings} />}
        {activeTab === TABS.STOCK && <StockTable filaments={filaments} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />}
        {activeTab === TABS.SETTINGS && <SettingsPanel settings={settings} onSave={saveSettings} />}
      </main>
    </div>
  );
}

function Dashboard({ orders, products, filaments, settings }) {
  const stats = useMemo(() => {
    const openOrders = orders.filter(o => o.status !== 'Afgerond');
    let totalRevenue = 0;
    let totalCost = 0;

    orders.forEach(order => {
      const qty = Number(order.quantity) || 1;
      totalRevenue += (Number(order.price) || 0) * qty;
      const prod = products.find(p => p.id === order.productId);
      if (prod) {
        let materialCostForOne = 0;
        (prod.filaments || []).forEach(assignment => {
          const gramPrice = getFilamentGramPrice(filaments, assignment.key);
          materialCostForOne += assignment.weight * gramPrice;
        });
        const energyCost = (prod.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
        totalCost += (materialCostForOne + energyCost) * qty;
      }
    });

    const prognosis = {};
    openOrders.forEach(order => {
      const prod = products.find(p => p.id === order.productId);
      if (prod) {
        (prod.filaments || []).forEach(assignment => {
          if (!prognosis[assignment.key]) prognosis[assignment.key] = { needed: 0, activeWeight: 0, stockWeight: 0, label: assignment.key };
          prognosis[assignment.key].needed += (assignment.weight * (Number(order.quantity) || 1));
        });
      }
    });

    filaments.forEach(f => {
      const key = `${f.brand}-${f.materialType}-${f.colorName}`;
      if (!prognosis[key]) prognosis[key] = { needed: 0, activeWeight: 0, stockWeight: 0, label: key };
      const remaining = f.totalWeight - (f.usedWeight || 0);
      if (f.status === 'actief') prognosis[key].activeWeight += remaining;
      if (f.status === 'voorraad') prognosis[key].stockWeight += remaining;
    });

    const criticalFilaments = filaments.filter(f => (f.status === 'actief' || f.status === 'voorraad') && ((f.totalWeight - (f.usedWeight || 0)) / (f.totalWeight || 1)) < 0.15);
    return { openOrders: openOrders.length, totalRevenue, totalProfit: totalRevenue - totalCost, criticalFilaments, prognosis };
  }, [orders, products, filaments, settings]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Open Orders" value={stats.openOrders} icon={<Clock size={20} />} color="text-orange-600" bg="bg-orange-50" />
        <StatCard title="Omzet" value={`€${stats.totalRevenue.toFixed(2)}`} icon={<Euro size={20} />} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title="Winst" value={`€${stats.totalProfit.toFixed(2)}`} icon={<TrendingUp size={20} />} color="text-indigo-600" bg="bg-indigo-50" />
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center">
          <AlertTriangle size={20} className={stats.criticalFilaments.length > 0 ? "text-rose-500 animate-pulse" : "text-slate-300"} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Voorraad Alerts</p>
          <p className="text-2xl font-black text-slate-900 italic">{stats.criticalFilaments.length}</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
           <Activity size={24} className="text-purple-600" />
           <h2 className="text-xl font-black italic uppercase tracking-tighter">Filament Prognose</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(stats.prognosis).filter(([_, d]) => d.needed > 0).map(([key, data]) => {
            const totalAvail = data.activeWeight + data.stockWeight;
            const shortage = data.needed > totalAvail;
            const labelParts = data.label.split('-');
            return (
              <div key={key} className={`p-6 rounded-3xl border ${shortage ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-black uppercase text-slate-900 tracking-tight leading-none">{labelParts[0]} {labelParts[2]}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{labelParts[1]}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${shortage ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {shortage ? 'Bijbestellen' : 'Voldoende'}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400 uppercase tracking-tighter italic">Nodig</span>
                    <span className="text-slate-900">{Math.round(data.needed)}g</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400 uppercase tracking-tighter italic">In Gebruik</span>
                    <span className="text-slate-600">{Math.round(data.activeWeight)}g</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400 uppercase tracking-tighter italic">In Voorraad</span>
                    <span className="text-slate-600">{Math.round(data.stockWeight)}g</span>
                  </div>
                  <div className="h-2 w-full bg-white rounded-full overflow-hidden shadow-inner mt-4">
                    <div 
                      className={`h-full transition-all duration-500 ${shortage ? 'bg-rose-500' : 'bg-purple-500'}`} 
                      style={{ width: `${Math.min(100, (totalAvail / (data.needed || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, bg }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:shadow-lg transition-all duration-300">
      <div className={`p-4 ${bg} ${color} rounded-2xl shadow-sm`}>{icon}</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-2 text-center">{title}</p>
      <p className="text-2xl font-black text-slate-900 tracking-tighter italic">{value}</p>
    </div>
  );
}

function OrderList({ orders, products, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ customer: '', messengerLink: '', productId: '', price: '', quantity: 1, status: 'In de wacht', orderDate: new Date().toISOString().split('T')[0] });
  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('orders', { ...formData, price: Number(formData.price), quantity: Number(formData.quantity) });
    setShowModal(false);
  };
  return (
    <div className="space-y-6">
      <button onClick={() => setShowModal(true)} className="text-white px-10 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-xl border-none outline-none active:scale-95 transition-all uppercase text-sm italic" style={{ backgroundColor: '#9333ea' }}>
        <Plus size={20} strokeWidth={3} /> Bestelling Invoeren
      </button>
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr><th className="px-8 py-5">Klant & Link</th><th className="px-8 py-5">Product Details</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-right">Beheer</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold">
            {orders.sort((a,b) => new Date(b.orderDate) - new Date(a.orderDate)).map(order => (
              <tr key={order.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div><p className="text-slate-900">{order.customer}</p><p className="text-[10px] text-slate-400 uppercase tracking-wider">{order.orderDate}</p></div>
                    {order.messengerLink && <a href={order.messengerLink} target="_blank" rel="noreferrer" className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all"><MessageCircle size={18} /></a>}
                  </div>
                </td>
                <td className="px-8 py-6"><p className="text-slate-700 text-sm italic">{products.find(p => p.id === order.productId)?.name || 'Onbekend'}</p><p className="text-[10px] text-purple-500 font-black mt-1 uppercase">€{(order.price * order.quantity).toFixed(2)} ({order.quantity}x)</p></td>
                <td className="px-8 py-6">
                  <select value={order.status} onChange={(e) => onUpdate('orders', order.id, { status: e.target.value })} className="bg-transparent border-0 text-[10px] font-black uppercase text-purple-600 outline-none cursor-pointer">
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-8 py-6 text-right"><button onClick={() => onDelete('orders', order.id)} className="text-slate-200 hover:text-rose-500 border-none bg-transparent outline-none ring-0 p-2"><Trash2 size={20} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && <Modal title="Nieuwe Bestelling" onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4"><Input label="Klant Naam" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} required /><Input label="Datum" type="date" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} required /></div>
          <Input label="Messenger Link" placeholder="Social media link..." value={formData.messengerLink} onChange={e => setFormData({...formData, messengerLink: e.target.value})} />
          <select required className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-none font-bold shadow-inner" value={formData.productId} onChange={e => {
            const p = products.find(prod => prod.id === e.target.value);
            setFormData({...formData, productId: e.target.value, price: p?.suggestedPrice || ''});
          }}>
            <option value="">Selecteer product...</option>
            {products.filter(p => p.status !== 'gearchiveerd').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-4"><Input label="Aantal" type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required /><Input label="Prijs p/s (€)" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required /></div>
          <button type="submit" className="w-full py-5 text-white rounded-2xl font-black italic uppercase shadow-xl border-none outline-none active:scale-95 transition-all" style={{ backgroundColor: '#9333ea' }}>Bestelling Opslaan</button>
        </form>
      </Modal>}
    </div>
  );
}

function ProductList({ products, filaments, onAdd, onUpdate, onDelete, settings }) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [archived, setArchived] = useState(false);
  const [formData, setFormData] = useState({ name: '', filaments: [], suggestedPrice: '', timeH: 0, timeM: 0 });
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef(null);

  const uniqueFilamentTypes = useMemo(() => {
    const types = {};
    filaments.forEach(f => {
      const key = `${f.brand}-${f.materialType}-${f.colorName}`;
      if (!types[key]) types[key] = { key, brand: f.brand, materialType: f.materialType, colorName: f.colorName, colorCode: f.colorCode };
    });
    return Object.values(types);
  }, [filaments]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => archived ? p.status === 'gearchiveerd' : p.status !== 'gearchiveerd');
  }, [products, archived]);

  const totalWeight = useMemo(() => {
    return (formData.filaments || []).reduce((sum, f) => sum + (Number(f.weight) || 0), 0);
  }, [formData.filaments]);

  const estimatedCost = useMemo(() => {
    const materialCost = (formData.filaments || []).reduce((sum, f) => sum + (f.weight * getFilamentGramPrice(filaments, f.key)), 0);
    const totalMins = (Number(formData.timeH) * 60) + Number(formData.timeM);
    const energyCost = (totalMins / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
    return materialCost + energyCost;
  }, [formData.filaments, formData.timeH, formData.timeM, filaments, settings]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true);
    try {
      const is3MF = file.name.toLowerCase().endsWith('.3mf');
      let content = "";
      if (is3MF) {
        if (!window.JSZip) throw new Error("ZIP bibliotheek niet geladen.");
        const zip = await window.JSZip.loadAsync(file);
        const gcodeFile = Object.keys(zip.files).find(name => name.endsWith('.gcode'));
        if (gcodeFile) content = await zip.files[gcodeFile].async("string");
      } else {
        const reader = new FileReader();
        content = await new Promise((resolve) => {
          reader.onload = (ev) => resolve(ev.target.result);
          reader.readAsText(file);
        });
      }
      if (content) {
        const meta = parseMetadataFromText(content);
        setFormData(prev => ({ ...prev, timeH: Math.floor(meta.time / 60), timeM: meta.time % 60 }));
      }
    } catch (err) { console.error(err); } finally { setParsing(false); }
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      filaments: p.filaments || [],
      suggestedPrice: p.suggestedPrice || '',
      timeH: Math.floor((p.printTime || 0) / 60),
      timeM: (p.printTime || 0) % 60
    });
    setShowModal(true);
  };

  const adjustStock = (p, delta) => {
    onUpdate('products', p.id, { stockQuantity: (p.stockQuantity || 0) + delta });
  };

  const toggleStatus = (p) => {
    const newStatus = p.status === 'gearchiveerd' ? 'actief' : 'gearchiveerd';
    onUpdate('products', p.id, { status: newStatus });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between gap-4">
        <button onClick={() => { setEditingId(null); setFormData({name:'', filaments:[], suggestedPrice:'', timeH:0, timeM:0}); setShowModal(true); }} className="text-white px-10 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-xl border-none outline-none active:scale-95 transition-all uppercase text-sm italic" style={{ backgroundColor: '#9333ea' }}>
          <Plus size={20} strokeWidth={3} /> Nieuw Product
        </button>
        <button onClick={() => setArchived(!archived)} className="text-[10px] font-black uppercase text-slate-400 border-none bg-transparent flex items-center gap-2 hover:text-purple-600 transition-colors">
          <Archive size={14} /> {archived ? 'Toon Actieve Catalogus' : 'Toon Archief'}
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr><th className="px-8 py-5">Product</th><th className="px-8 py-5">Specificaties</th><th className="px-8 py-5">Gereed Voorraad</th><th className="px-8 py-5 text-right">Beheer</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredProducts.map(p => {
              const isEx = expanded[p.id];
              const hours = Math.floor((p.printTime || 0) / 60);
              const mins = (p.printTime || 0) % 60;
              const matCost = (p.filaments || []).reduce((sum, f) => sum + (f.weight * getFilamentGramPrice(filaments, f.key)), 0);
              const energyCost = ((p.printTime || 0) / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
              const liveCost = matCost + energyCost;

              return (
                <React.Fragment key={p.id}>
                  <tr onClick={() => setExpanded(prev => ({...prev, [p.id]: !prev[p.id]}))} className="cursor-pointer hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-900 tracking-tight">{p.name}</p>
                      <div className="flex gap-1 mt-1">
                        {(p.filaments || []).map(f => (
                          <div key={f.key} className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: filaments.find(fil => `${fil.brand}-${fil.materialType}-${fil.colorName}` === f.key)?.colorCode }}></div>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-700 italic">{p.weight}g</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest">{hours}u {mins}m printtijd</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); adjustStock(p, -1); }} className="p-1.5 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all border-none"><Minus size={14}/></button>
                        <p className="text-xl font-black italic text-purple-600 min-w-[1.5rem] text-center">{p.stockQuantity || 0}</p>
                        <button onClick={(e) => { e.stopPropagation(); adjustStock(p, 1); }} className="p-1.5 bg-slate-50 text-slate-400 hover:text-emerald-500 rounded-lg transition-all border-none"><Plus size={14}/></button>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-2 text-slate-300 hover:text-purple-600 border-none bg-transparent outline-none"><Edit3 size={18}/></button>
                        <button onClick={(e) => { e.stopPropagation(); toggleStatus(p); }} className="p-2 text-slate-300 hover:text-purple-600 border-none bg-transparent outline-none">{archived ? <RefreshCw size={18}/> : <Archive size={18}/>}</button>
                        {isEx ? <ChevronDown size={22} className="text-purple-600" /> : <ChevronRight size={22} className="text-slate-300" />}
                      </div>
                    </td>
                  </tr>
                  {isEx && (
                    <tr className="bg-slate-50/30 border-l-[6px] border-purple-500">
                      <td colSpan="4" className="px-12 py-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="space-y-3">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Filamenten</p>
                            {(p.filaments || []).map(f => (
                              <div key={f.key} className="flex items-center justify-between text-xs font-bold bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-slate-500 uppercase tracking-tighter">{f.key.split('-')[0]} {f.key.split('-')[2]}</span>
                                <span className="text-purple-600">{f.weight}g</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-3">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Financieel</p>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Actuele Kostprijs</p>
                              <p className="text-2xl font-black text-slate-600 italic">€{liveCost.toFixed(2)}</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 shadow-sm">
                              <p className="text-[8px] font-black text-purple-300 uppercase mb-1">Verkoopprijs</p>
                              <p className="text-2xl font-black text-purple-600 italic">€{(p.suggestedPrice || 0).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex flex-col justify-end items-end gap-4">
                            <button onClick={() => onDelete('products', p.id)} className="flex items-center gap-2 text-rose-500 font-black uppercase text-[10px] hover:bg-rose-50 p-3 rounded-xl transition-all border-none bg-transparent outline-none"><Trash2 size={16}/> Verwijder Definitief</button>
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

      {showModal && <Modal title={editingId ? "Product Bewerken" : "Product Toevoegen"} onClose={() => setShowModal(false)}>
        <div className="mb-8 p-6 bg-purple-50 rounded-3xl border border-dashed border-purple-300 text-center">
          <input type="file" accept=".gcode,.3mf" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 w-full text-purple-600 hover:text-purple-800 transition-colors">
            {parsing ? <RefreshCw className="animate-spin" /> : <Upload size={32} />}
            <p className="text-[10px] font-black uppercase tracking-widest">{parsing ? "Laden..." : "Importeer G-code of .3mf"}</p>
          </button>
        </div>
        <form onSubmit={(e) => { 
          e.preventDefault(); 
          const finalData = { 
            name: formData.name, 
            filaments: formData.filaments, 
            weight: totalWeight, 
            printTime: (Number(formData.timeH) * 60) + Number(formData.timeM), 
            suggestedPrice: Number(formData.suggestedPrice) 
          };
          editingId ? onUpdate('products', editingId, finalData) : onAdd('products', {...finalData, stockQuantity: 0, status: 'actief'});
          setShowModal(false);
          setEditingId(null);
        }} className="space-y-6">
          <Input label="Naam Product" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-3 mb-1 block">Uren</label>
              <input type="number" className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-black text-slate-700 shadow-inner outline-none" value={formData.timeH} onChange={e => setFormData({...formData, timeH: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-3 mb-1 block">Minuten</label>
              <input type="number" max="59" className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-black text-slate-700 shadow-inner outline-none" value={formData.timeM} onChange={e => setFormData({...formData, timeM: e.target.value})} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center px-3">
              <label className="text-[10px] font-black uppercase text-slate-400">Filamenten (Gewicht in Gram)</label>
              <span className="text-[10px] font-black text-purple-600 uppercase">Totaal: {totalWeight}g</span>
            </div>
            <div className="max-h-60 overflow-y-auto p-4 bg-slate-50 rounded-[2rem] space-y-3 shadow-inner">
              {uniqueFilamentTypes.map(type => {
                const assign = formData.filaments.find(f => f.key === type.key);
                return (
                  <div key={type.key} className="space-y-2">
                    <button type="button" onClick={() => setFormData(prev => { const ex = prev.filaments.find(f => f.key === type.key); return { ...prev, filaments: ex ? prev.filaments.filter(f => f.key !== type.key) : [...prev.filaments, { key: type.key, weight: 0 }] }; })} className={`p-4 w-full rounded-2xl text-[10px] font-black uppercase flex items-center justify-between transition-all ${assign ? 'text-white' : 'bg-white text-slate-500'}`} style={{ backgroundColor: assign ? '#9333ea' : undefined }}>
                      <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: type.colorCode }}></div><span>{type.brand} {type.colorName}</span></div>
                      {assign && <CheckCircle2 size={16} />}
                    </button>
                    {assign && <div className="px-4 pb-2"><div className="flex bg-white rounded-xl border border-purple-200 p-2 items-center gap-2"><span className="text-[9px] font-black text-slate-400 uppercase ml-2">Gram:</span><input type="number" className="w-full text-xs font-black outline-none border-none p-0 bg-transparent" value={assign.weight} onChange={(e) => setFormData(p => ({ ...p, filaments: p.filaments.map(f => f.key === type.key ? { ...f, weight: Number(e.target.value) } : f) }))} /></div></div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4 bg-purple-50 p-6 rounded-[2rem] border border-purple-100 shadow-sm">
            <div className="flex-1"><Input label="Verkoopprijs (€)" type="number" step="0.01" value={formData.suggestedPrice} onChange={e => setFormData({...formData, suggestedPrice: e.target.value})} required /></div>
            <div className="text-right">
              <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-1">Geschatte Kost</p>
              <p className="text-2xl font-black text-purple-600 italic">€{estimatedCost.toFixed(2)}</p>
            </div>
          </div>
          <button type="submit" className="w-full py-5 text-white rounded-2xl font-black italic uppercase shadow-xl" style={{ backgroundColor: '#9333ea' }}>Product Opslaan</button>
        </form>
      </Modal>}
    </div>
  );
}

function StockTable({ filaments, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [archived, setArchived] = useState(false);
  const [formData, setFormData] = useState({ brand: '', materialType: 'PLA', colorName: '', colorCode: '#9333ea', totalWeight: 1000, price: '', purchaseDate: new Date().toISOString().split('T')[0], shopName: '', quantity: 1 });

  const grouped = useMemo(() => {
    const res = {};
    filaments.filter(f => (archived ? f.status === 'leeg' : (f.status === 'actief' || f.status === 'voorraad'))).forEach(f => {
      const k = `${f.brand}-${f.materialType}-${f.colorName}`;
      if (!res[k]) res[k] = { ...f, rolls: [] };
      res[k].rolls.push(f);
    });
    return Object.values(res);
  }, [filaments, archived]);

  const handleStatusChange = (roll, newStatus) => {
    if (newStatus === 'actief') {
      const rollKey = `${roll.brand}-${roll.materialType}-${roll.colorName}`;
      filaments.filter(f => f.status === 'actief' && `${f.brand}-${f.materialType}-${f.colorName}` === rollKey && f.id !== roll.id)
        .forEach(f => onUpdate('filaments', f.id, { status: 'voorraad' }));
    }
    onUpdate('filaments', roll.id, { status: newStatus });
  };

  const manualAdjustUsed = (roll, val) => {
    onUpdate('filaments', roll.id, { usedWeight: (roll.usedWeight || 0) + Number(val) });
  };

  const setAbsoluteWeight = (roll, val) => {
    const newUsed = roll.totalWeight - Number(val);
    onUpdate('filaments', roll.id, { usedWeight: Math.max(0, newUsed) });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4">
        <button onClick={() => setShowModal(true)} className="text-white px-10 py-4 rounded-2xl font-bold shadow-xl border-none active:scale-95 transition-all uppercase text-sm italic" style={{ backgroundColor: '#9333ea' }}>
          <Plus size={20} className="inline mr-2" /> Rol Toevoegen
        </button>
        <button onClick={() => setArchived(!archived)} className="text-[10px] font-black uppercase text-slate-400 border-none bg-transparent flex items-center gap-2 hover:text-purple-600 transition-colors">
          <Archive size={14} /> {archived ? 'Toon Actieve Voorraad' : 'Toon Gearchiveerd (Leeg)'}
        </button>
      </div>
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr><th className="px-8 py-5">Kleur</th><th className="px-8 py-5">Omschrijving</th><th className="px-8 py-5">Totaal (Actief + Voorraad)</th><th className="px-8 py-5 text-right">Beheer</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {grouped.map(g => {
              const k = `${g.brand}-${g.materialType}-${g.colorName}`;
              const isEx = expanded[k];
              const rem = g.rolls.reduce((a, r) => a + (r.totalWeight - (r.usedWeight || 0)), 0);
              return (
                <React.Fragment key={k}>
                  <tr onClick={() => setExpanded(p => ({...p, [k]: !p[k]}))} className="cursor-pointer hover:bg-slate-50/50 group">
                    <td className="px-8 py-6"><div className="w-8 h-8 rounded-xl border border-slate-200 shadow-sm" style={{ backgroundColor: g.colorCode }}></div></td>
                    <td className="px-8 py-6"><p className="font-bold text-slate-900">{g.brand} {g.materialType}</p><p className="text-[10px] text-slate-400 uppercase mt-1">{g.colorName}</p></td>
                    <td className="px-8 py-6"><p className="font-black text-slate-800 text-lg italic">{Math.round(rem)}g</p><p className="text-[9px] text-slate-400 uppercase tracking-widest">{g.rolls.length} rollen</p></td>
                    <td className="px-8 py-6 text-right">{isEx ? <ChevronDown size={22} className="text-purple-600" /> : <ChevronRight size={22} className="text-slate-300" />}</td>
                  </tr>
                  {isEx && g.rolls.sort((a,b) => a.status === 'actief' ? -1 : 1).map(r => (
                    <tr key={r.id} className="bg-slate-50/30 border-l-[6px] border-purple-500 text-xs">
                      <td colSpan="2" className="px-12 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${r.status === 'actief' ? 'bg-emerald-500 shadow-sm' : r.status === 'voorraad' ? 'bg-blue-400' : 'bg-slate-300'}`}></div>
                          <p className="font-black text-slate-500 uppercase tracking-widest">
                            {r.status === 'actief' ? 'In Gebruik' : r.status === 'voorraad' ? 'In Voorraad' : 'Leeg'} - Rol #{r.id.slice(-4)}
                          </p>
                        </div>
                        <p className="text-slate-400 font-bold italic">{r.shopName || 'Onbekend'} • {r.purchaseDate}</p>
                      </td>
                      <td className="px-8 py-4"><p className="font-black italic text-slate-700">{Math.round(r.totalWeight - (r.usedWeight || 0))}g / {r.totalWeight}g</p></td>
                      <td className="px-8 py-4 text-right flex flex-col gap-2 items-end">
                        <div className="flex items-center gap-2">
                          <div className="flex bg-white rounded-xl border border-slate-200 p-1 px-3 items-center shadow-sm">
                            <Hash size={12} className="text-purple-500 mr-2" />
                            <input type="number" placeholder="+/- Gram" className="w-14 text-[10px] font-bold outline-none border-none p-0 bg-transparent" onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { manualAdjustUsed(r, e.target.value); e.target.value = ''; } }} />
                          </div>
                          <div className="flex bg-white rounded-xl border border-slate-200 p-1 px-3 items-center shadow-sm">
                            <Scale size={12} className="text-emerald-500 mr-2" />
                            <input type="number" placeholder="Stel in..." className="w-16 text-[10px] font-bold outline-none border-none p-0 bg-transparent" onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { setAbsoluteWeight(r, e.target.value); e.target.value = ''; } }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {r.status === 'voorraad' && (
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(r, 'actief'); }} className="p-2 text-blue-500 hover:bg-white rounded-xl transition-all" title="Start gebruik"><PlayCircle size={18}/></button>
                          )}
                          {r.status === 'actief' && (
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(r, 'leeg'); }} className="p-2 text-emerald-500 hover:bg-white rounded-xl transition-all" title="Markeer als leeg"><CheckCircle2 size={18}/></button>
                          )}
                          {r.status === 'leeg' && (
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(r, 'voorraad'); }} className="p-2 text-slate-400 hover:bg-white rounded-xl transition-all" title="Terug naar voorraad"><RefreshCw size={18}/></button>
                          )}
                          <button onClick={e => { e.stopPropagation(); onDelete('filaments', r.id); }} className="text-slate-200 hover:text-rose-500 p-2 border-none bg-transparent outline-none"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {showModal && <Modal title="Filament Toevoegen" onClose={() => setShowModal(false)}>
        <form onSubmit={(e) => { e.preventDefault(); onAdd('filaments', { ...formData, usedWeight: 0, price: Number(formData.price) }); setShowModal(false); }} className="space-y-6">
          <div className="grid grid-cols-2 gap-4"><Input label="Merk" placeholder="Bambu Lab" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} required /><Input label="Materiaal" placeholder="PLA" value={formData.materialType} onChange={e => setFormData({...formData, materialType: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4"><Input label="Kleur" placeholder="Lava Red" value={formData.colorName} onChange={e => setFormData({...formData, colorName: e.target.value})} required /><div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-3 mb-1 block">Hex Kleur</label><input type="color" className="w-full h-12 p-1 bg-slate-50 rounded-2xl border-none cursor-pointer shadow-inner" value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} /></div></div>
          <div className="grid grid-cols-2 gap-4"><Input label="Prijs p/s (€)" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required /><Input label="Gewicht p/s (g)" type="number" value={formData.totalWeight} onChange={e => setFormData({...formData, totalWeight: e.target.value})} required /></div>
          <Input label="Aantal rollen" type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
          <button type="submit" className="w-full py-5 text-white rounded-2xl font-black italic uppercase shadow-xl" style={{ backgroundColor: '#9333ea' }}>In Voorraad Plaatsen</button>
        </form>
      </Modal>}
    </div>
  );
}

function SettingsPanel({ settings, onSave }) {
  const [temp, setTemp] = useState(settings);
  return (
    <div className="max-w-md bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-right-4">
      <h2 className="text-2xl font-black italic uppercase text-purple-600 tracking-tighter">Instellingen</h2>
      <Input label="Stroomprijs per kWh (€)" type="number" step="0.01" value={temp.kwhPrice} onChange={e => setTemp({...temp, kwhPrice: Number(e.target.value)})} />
      <Input label="Printer Verbruik (Watt)" type="number" value={temp.printerWattage} onChange={e => setTemp({...temp, printerWattage: Number(e.target.value)})} />
      <button onClick={() => onSave(temp)} className="w-full py-5 text-white rounded-2xl font-black italic uppercase shadow-xl border-none outline-none active:scale-95 transition-all" style={{ backgroundColor: '#9333ea' }}>Instellingen Opslaan</button>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1 flex-1">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-3 mb-1 block tracking-wider">{label}</label>
      <input {...props} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-black text-slate-700 shadow-inner focus:bg-slate-100 ring-0 outline-none transition-all" />
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh] border border-white">
        <div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">{title}</h2><button onClick={onClose} className="text-slate-300 hover:text-slate-500 border-none bg-transparent outline-none"><Plus size={32} className="rotate-45" /></button></div>
        {children}
      </div>
    </div>
  );
}