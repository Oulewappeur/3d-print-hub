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
  Upload
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

// Gebruik de omgevingsconfiguratie indien beschikbaar (voor Canvas), anders jouw eigen config
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : myFirebaseConfig;

// Gebruik het dynamische appId van de omgeving, of jouw eigen project-ID als fallback
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

// G-code Parser Utility
const parseGCodeMetadata = (text) => {
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

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [filaments, setFilaments] = useState([]);
  const [settings, setSettings] = useState({ kwhPrice: 0.35, printerWattage: 150 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // STAP 1: Authenticatie (MANDATORY RULE 3)
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

  // STAP 2: Data ophalen (MANDATORY RULE 3)
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
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', coll), { 
        ...data, 
        status: data.status || 'actief', 
        createdAt: new Date().toISOString() 
      });
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
               <span>Toegangfout in Canvas</span>
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
        {activeTab === TABS.CATALOG && <ProductList products={products} filaments={filaments} onAdd={addItem} onDelete={deleteItem} />}
        {activeTab === TABS.STOCK && <StockTable filaments={filaments} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />}
        {activeTab === TABS.SETTINGS && <SettingsPanel settings={settings} onSave={saveSettings} />}
      </main>
    </div>
  );
}

function Dashboard({ orders, products, filaments, settings }) {
  const stats = useMemo(() => {
    const openOrders = orders.filter(o => o.status !== 'Afgerond').length;
    let totalRevenue = 0;
    let totalCost = 0;

    orders.forEach(order => {
      const qty = Number(order.quantity) || 1;
      totalRevenue += (Number(order.price) || 0) * qty;
      const prod = products.find(p => p.id === order.productId);
      if (prod) {
        let materialCostForOne = 0;
        const linkedFilaments = filaments.filter(f => prod.filamentIds?.includes(f.id));
        if (linkedFilaments.length > 0) {
          const weightPerFilament = prod.weight / linkedFilaments.length;
          linkedFilaments.forEach(f => { materialCostForOne += (weightPerFilament / (f.totalWeight || 1000)) * f.price; });
        }
        const energyCost = (prod.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
        totalCost += (materialCostForOne + energyCost) * qty;
      }
    });

    const criticalFilaments = filaments.filter(f => f.status === 'actief' && ((f.totalWeight - (f.usedWeight || 0)) / (f.totalWeight || 1)) < 0.15);
    return { openOrders, totalRevenue, totalProfit: totalRevenue - totalCost, criticalFilaments };
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
      <button 
        onClick={() => setShowModal(true)} 
        className="text-white px-10 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-xl border-none active:scale-95 transition-all uppercase text-sm italic" 
        style={{ backgroundColor: '#9333ea' }}
      >
        <Plus size={20} strokeWidth={3} /> Bestelling Invoeren
      </button>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-8 py-5">Klant & Link</th>
              <th className="px-8 py-5">Product Details</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5 text-right">Beheer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold">
            {orders.sort((a,b) => new Date(b.orderDate) - new Date(a.orderDate)).map(order => (
              <tr key={order.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-slate-900">{order.customer}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{order.orderDate}</p>
                    </div>
                    {order.messengerLink && (
                      <a href={order.messengerLink} target="_blank" rel="noreferrer" className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all">
                        <MessageCircle size={18} />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-slate-700 text-sm italic">{products.find(p => p.id === order.productId)?.name || 'Onbekend'}</p>
                  <p className="text-[10px] text-purple-500 font-black mt-1 uppercase">€{(order.price * order.quantity).toFixed(2)} ({order.quantity}x)</p>
                </td>
                <td className="px-8 py-6">
                  <select 
                    value={order.status} 
                    onChange={(e) => onUpdate('orders', order.id, { status: e.target.value })} 
                    className="bg-transparent border-0 text-[10px] font-black uppercase text-purple-600 outline-none cursor-pointer"
                  >
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-8 py-6 text-right">
                  <button onClick={() => onDelete('orders', order.id)} className="text-slate-200 hover:text-rose-500 border-none bg-transparent outline-none ring-0 p-2"><Trash2 size={20} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Nieuwe Bestelling" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Klant Naam" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} required />
              <Input label="Datum" type="date" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} required />
            </div>
            <Input label="Messenger Link" placeholder="Plak link naar gesprek..." value={formData.messengerLink} onChange={e => setFormData({...formData, messengerLink: e.target.value})} />
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-3 block">Product</label>
              <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold shadow-inner" value={formData.productId} onChange={e => {
                const p = products.find(prod => prod.id === e.target.value);
                setFormData({...formData, productId: e.target.value, price: p?.suggestedPrice || ''});
              }}>
                <option value="">Selecteer product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Aantal" type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
              <Input label="Prijs p/s (€)" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
            </div>
            <button type="submit" className="w-full py-5 text-white rounded-2xl font-black italic uppercase shadow-xl border-none outline-none active:scale-95 transition-all" style={{ backgroundColor: '#9333ea' }}>Opslaan</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ProductList({ products, filaments, onAdd, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', weight: '', printTime: '', filamentIds: [], suggestedPrice: '' });
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const meta = parseGCodeMetadata(ev.target.result);
      setFormData(prev => ({ ...prev, weight: meta.weight || prev.weight, printTime: meta.time || prev.printTime }));
      setParsing(false);
    };
    reader.readAsText(file);
  };

  const groupedFilaments = useMemo(() => {
    const res = {};
    filaments.filter(f => f.status === 'actief').forEach(f => {
      const key = `${f.brand}-${f.colorName}`;
      if (!res[key]) res[key] = { ...f, rolls: [] };
      res[key].rolls.push(f);
    });
    return Object.values(res);
  }, [filaments]);

  const toggleFilament = (id) => setFormData(prev => ({ ...prev, filamentIds: prev.filamentIds.includes(id) ? prev.filamentIds.filter(fid => fid !== id) : [...prev.filamentIds, id] }));

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <button onClick={() => setShowModal(true)} className="text-white px-10 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-xl border-none active:scale-95 transition-all uppercase text-sm italic" style={{ backgroundColor: '#9333ea' }}>
        <Plus size={20} strokeWidth={3} /> Nieuw Product
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {products.map(p => (
          <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group hover:shadow-xl transition-all">
            <h3 className="text-xl font-black italic uppercase text-slate-800">{p.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">{p.weight}g • {p.printTime}m</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {p.filamentIds?.map(fid => {
                const f = filaments.find(fil => fil.id === fid);
                return f ? <div key={fid} className="w-5 h-5 rounded-full border border-slate-200" style={{ backgroundColor: f.colorCode }}></div> : null;
              })}
            </div>
            <div className="flex items-end justify-between">
              <div className="bg-purple-50 px-6 py-4 rounded-2xl border border-purple-100/50">
                <p className="text-[9px] font-black text-purple-400 uppercase text-center tracking-widest mb-1">Adviesprijs</p>
                <p className="text-2xl font-black text-purple-600 italic">€{(p.suggestedPrice || 0).toFixed(2)}</p>
              </div>
              <button onClick={() => onDelete('products', p.id)} className="text-slate-200 hover:text-rose-500 border-none bg-transparent outline-none ring-0 p-2"><Trash2 size={22}/></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title="Product Toevoegen" onClose={() => setShowModal(false)}>
          <div className="mb-8 p-6 bg-purple-50 rounded-3xl border border-dashed border-purple-300 text-center">
            <input type="file" accept=".gcode" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 w-full text-purple-600 hover:text-purple-800 transition-colors">
              {parsing ? <RefreshCw className="animate-spin" /> : <Upload size={32} />}
              <p className="text-[10px] font-black uppercase tracking-widest">{parsing ? "Parsing G-code..." : "Lees G-code bestand in"}</p>
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onAdd('products', { ...formData, weight: Number(formData.weight), printTime: Number(formData.printTime), suggestedPrice: Number(formData.suggestedPrice) }); setShowModal(false); }} className="space-y-6">
            <Input label="Naam Product" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Gewicht (g)" type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} required />
              <Input label="Print Tijd (min)" type="number" value={formData.printTime} onChange={e => setFormData({...formData, printTime: e.target.value})} required />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-3">Gekoppelde Filamenten</label>
              <div className="max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-[2rem] space-y-4 shadow-inner">
                {groupedFilaments.map(g => g.rolls.map(roll => (
                  <button key={roll.id} type="button" onClick={() => toggleFilament(roll.id)} className={`p-4 w-full mb-2 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 transition-all ${formData.filamentIds.includes(roll.id) ? 'text-white' : 'bg-white text-slate-500'}`} style={{ backgroundColor: formData.filamentIds.includes(roll.id) ? '#9333ea' : undefined }}>
                    <div className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: roll.colorCode }}></div>
                    <span>{g.brand} {g.colorName} (#{roll.id.slice(-4)})</span>
                  </button>
                )))}
              </div>
            </div>
            <Input label="Verkoopprijs (€)" type="number" step="0.01" value={formData.suggestedPrice} onChange={e => setFormData({...formData, suggestedPrice: e.target.value})} required />
            <button type="submit" className="w-full py-5 text-white rounded-2xl font-black italic uppercase shadow-xl border-none outline-none active:scale-95 transition-all" style={{ backgroundColor: '#9333ea' }}>Product Opslaan</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StockTable({ filaments, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [archived, setArchived] = useState(false);
  const [formData, setFormData] = useState({ brand: '', materialType: '', colorName: '', colorCode: '#9333ea', totalWeight: 1000, price: '', purchaseDate: new Date().toISOString().split('T')[0], shopName: '', quantity: 1 });

  const grouped = useMemo(() => {
    const res = {};
    filaments.filter(f => (archived ? f.status === 'leeg' : f.status === 'actief')).forEach(f => {
      const k = `${f.brand}-${f.materialType}-${f.colorName}`;
      if (!res[k]) res[k] = { ...f, rolls: [] };
      res[k].rolls.push(f);
    });
    return Object.values(res);
  }, [filaments, archived]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('filaments', { ...formData, usedWeight: 0, price: Number(formData.price) });
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4">
        <button onClick={() => setShowModal(true)} className="text-white px-10 py-4 rounded-2xl font-bold shadow-xl border-none active:scale-95 transition-all uppercase text-sm italic" style={{ backgroundColor: '#9333ea' }}>
          <Plus size={20} className="inline mr-2" /> Rol Toevoegen
        </button>
        <button onClick={() => setArchived(!archived)} className="text-[10px] font-black uppercase text-slate-400 border-none bg-transparent flex items-center gap-2 hover:text-purple-600 transition-colors">
          <Archive size={14} /> {archived ? 'Actief' : 'Archief'}
        </button>
      </div>
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr><th className="px-8 py-5">Kleur</th><th className="px-8 py-5">Omschrijving</th><th className="px-8 py-5">Voorraad</th><th className="px-8 py-5 text-right">Actie</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {grouped.map(g => {
              const k = `${g.brand}-${g.colorName}`;
              const isEx = expanded[k];
              const rem = g.rolls.reduce((a, r) => a + (r.totalWeight - (r.usedWeight || 0)), 0);
              return (
                <React.Fragment key={k}>
                  <tr onClick={() => setExpanded(p => ({...p, [k]: !p[k]}))} className="cursor-pointer hover:bg-slate-50/50">
                    <td className="px-8 py-6"><div className="w-8 h-8 rounded-xl border border-slate-200 shadow-sm" style={{ backgroundColor: g.colorCode }}></div></td>
                    <td className="px-8 py-6"><p className="font-bold text-slate-900">{g.brand} {g.materialType}</p><p className="text-[10px] text-slate-400 uppercase mt-1">{g.colorName}</p></td>
                    <td className="px-8 py-6"><p className="font-black text-slate-800 text-lg italic">{Math.round(rem)}g</p><p className="text-[9px] text-slate-400 uppercase">{g.rolls.length} rollen</p></td>
                    <td className="px-8 py-6 text-right">{isEx ? <ChevronDown size={22} className="text-purple-600" /> : <ChevronRight size={22} className="text-slate-300" />}</td>
                  </tr>
                  {isEx && g.rolls.map(r => (
                    <tr key={r.id} className="bg-slate-50/30 border-l-[6px] border-purple-500 text-xs">
                      <td colSpan="2" className="px-12 py-4"><p className="font-black text-slate-500 uppercase">#{r.id.slice(-4)} • {r.purchaseDate}</p><p className="text-slate-400">{r.shopName}</p></td>
                      <td className="px-8 py-4"><p className="font-black italic">{Math.round(r.totalWeight - (r.usedWeight || 0))}g / {r.totalWeight}g</p></td>
                      <td className="px-8 py-4 text-right flex items-center justify-end gap-2">
                        <div className="flex bg-white rounded-xl border border-slate-200 p-1 px-3 items-center shadow-sm focus-within:ring-2 focus-within:ring-purple-200">
                          <Hash size={12} className="text-purple-500 mr-2" />
                          <input type="number" placeholder="Invoer" className="w-10 text-[10px] font-bold outline-none border-none p-0 bg-transparent ring-0" onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { onUpdate('filaments', r.id, { usedWeight: (r.usedWeight || 0) + Number(e.target.value) }); e.target.value = ''; } }} />
                        </div>
                        <button onClick={e => { e.stopPropagation(); onDelete('filaments', r.id); }} className="text-slate-200 hover:text-rose-500 p-2"><Trash2 size={16}/></button>
                        <button onClick={e => { e.stopPropagation(); onUpdate('filaments', r.id, { status: archived ? 'actief' : 'leeg' }); }} className="text-slate-200 hover:text-purple-600 p-2">{archived ? <RefreshCw size={16}/> : <Archive size={16}/>}</button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {showModal && <Modal title="Rol Toevoegen" onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4"><Input label="Merk" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} required /><Input label="Materiaal" value={formData.materialType} onChange={e => setFormData({...formData, materialType: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4"><Input label="Kleur" value={formData.colorName} onChange={e => setFormData({...formData, colorName: e.target.value})} required /><div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-3 mb-1 block">Kleur Kies</label><input type="color" className="w-full h-12 p-1 bg-slate-50 rounded-2xl border-none cursor-pointer" value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} /></div></div>
          <div className="grid grid-cols-2 gap-4"><Input label="Prijs (€)" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required /><Input label="Gewicht (g)" type="number" value={formData.totalWeight} onChange={e => setFormData({...formData, totalWeight: e.target.value})} required /></div>
          <Input label="Aantal" type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
          <button type="submit" className="w-full py-5 text-white rounded-2xl font-black italic uppercase shadow-xl border-none outline-none" style={{ backgroundColor: '#9333ea' }}>Opslaan</button>
        </form>
      </Modal>}
    </div>
  );
}

function SettingsPanel({ settings, onSave }) {
  const [temp, setTemp] = useState(settings);
  return (
    <div className="max-w-md bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-right-4">
      <h2 className="text-2xl font-black italic uppercase text-purple-600">Tarieven</h2>
      <Input label="kWh Prijs (€)" type="number" step="0.01" value={temp.kwhPrice} onChange={e => setTemp({...temp, kwhPrice: Number(e.target.value)})} />
      <Input label="Printer Wattage" type="number" value={temp.printerWattage} onChange={e => setTemp({...temp, printerWattage: Number(e.target.value)})} />
      <button onClick={() => onSave(temp)} className="w-full py-5 text-white rounded-2xl font-black italic uppercase shadow-xl border-none outline-none" style={{ backgroundColor: '#9333ea' }}>Opslaan</button>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1 flex-1">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-3 mb-1 block tracking-wider">{label}</label>
      <input {...props} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-black text-slate-700 shadow-inner focus:bg-slate-100 ring-0 outline-none transition-all shadow-none" />
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh] border border-white">
        <div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-black italic uppercase text-slate-900">{title}</h2><button onClick={onClose} className="text-slate-300 hover:text-slate-500 border-none bg-transparent outline-none"><Plus size={32} className="rotate-45" /></button></div>
        {children}
      </div>
    </div>
  );
}