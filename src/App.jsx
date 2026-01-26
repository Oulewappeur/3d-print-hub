import React, { useState, useEffect, useMemo } from 'react';
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
  MessageSquare, 
  CheckCircle2 
} from 'lucide-react';

/**
 * FIREBASE CONFIGURATIE (Jouw specifieke gegevens)
 */
const myFirebaseConfig = {
  apiKey: "AIzaSyBbwO5zFRzKg_TeFSTGjm_G7OPitUtnDo0",
  authDomain: "d-printer-orders-1b6f3.firebaseapp.com",
  projectId: "d-printer-orders-1b6f3",
  storageBucket: "d-printer-orders-1b6f3.firebasestorage.app",
  messagingSenderId: "784230424225",
  appId: "1:784230424225:web:abbfb3011e515e1f6d1ae0",
  measurementId: "G-RJW0M8NF7Y"
};

// Fallback voor Canvas omgeving vs Productie (GitHub)
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : myFirebaseConfig;

// Unieke ID voor jouw Hub data-pad
const hubId = typeof __app_id !== 'undefined' ? __app_id : '3d-hub-production-v1';

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

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [filaments, setFilaments] = useState([]);
  const [settings, setSettings] = useState({ kwhPrice: 0.35, printerWattage: 150 });
  const [loading, setLoading] = useState(true);

  // 1. Authenticatie (MANDATORY RULE 3)
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
        setLoading(false);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data synchronisatie (MANDATORY RULE 1 & 2)
  useEffect(() => {
    if (!user) return;

    // Pad volgens RULE 1
    const getPath = (name) => collection(db, 'artifacts', hubId, 'public', 'data', name);

    const unsubOrders = onSnapshot(query(getPath('orders')), 
      (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, 
      (err) => console.error("Orders sync error:", err)
    );

    const unsubProducts = onSnapshot(query(getPath('products')), 
      (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, 
      (err) => console.error("Products sync error:", err)
    );

    const unsubFilaments = onSnapshot(query(getPath('filaments')), 
      (snapshot) => {
        setFilaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, 
      (err) => console.error("Filaments sync error:", err)
    );

    const unsubSettings = onSnapshot(doc(db, 'artifacts', hubId, 'public', 'data', 'settings', 'global'), 
      (docSnap) => {
        if (docSnap.exists()) setSettings(docSnap.data());
        setLoading(false);
      }, 
      (err) => {
        console.error("Settings sync error:", err);
        setLoading(false);
      }
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
    await addDoc(collection(db, 'artifacts', hubId, 'public', 'data', coll), {
      ...data,
      status: data.status || 'actief',
      createdAt: new Date().toISOString()
    });
  };

  const updateItem = async (coll, id, data) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id), data);
  };

  const deleteItem = async (coll, id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id));
  };

  const saveSettings = async (data) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', hubId, 'public', 'data', 'settings', 'global'), data);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-black text-blue-600 uppercase tracking-widest">3D Hub laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-900">
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-2 shadow-sm z-20">
        <div className="text-2xl font-black text-blue-600 mb-10 flex items-center gap-3 px-2">
          <div className="p-2 bg-blue-50 rounded-xl">
            <Printer size={28} strokeWidth={3} />
          </div>
          3D Hub
        </div>
        
        {Object.values(TABS).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 font-bold translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
          >
            {tab === TABS.DASHBOARD && <LayoutDashboard size={20} />}
            {tab === TABS.ORDERS && <ShoppingCart size={20} />}
            {tab === TABS.CATALOG && <Package size={20} />}
            {tab === TABS.STOCK && <Database size={20} />}
            {tab === TABS.SETTINGS && <Settings size={20} />}
            {tab}
          </button>
        ))}
        
        <div className="mt-auto p-4 bg-slate-50 rounded-2xl text-[10px] text-slate-400 font-mono break-all opacity-50 border border-slate-100">
          User: {user?.uid || 'Niet verbonden'}
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-12 overflow-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">{activeTab}</h1>
          <p className="text-slate-400 font-medium mt-1 tracking-wide">Workflow & Voorraad Beheer</p>
        </header>

        {activeTab === TABS.DASHBOARD && <Dashboard orders={orders} products={products} filaments={filaments} settings={settings} />}
        {activeTab === TABS.ORDERS && <OrderList orders={orders} products={products} filaments={filaments} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />}
        {activeTab === TABS.CATALOG && <ProductList products={products} filaments={filaments} settings={settings} onAdd={addItem} onDelete={deleteItem} />}
        {activeTab === TABS.STOCK && <StockList filaments={filaments} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />}
        {activeTab === TABS.SETTINGS && <SettingsPanel settings={settings} onSave={saveSettings} />}
      </main>
    </div>
  );
}

// --- Subcomponents ---

function Dashboard({ orders, products, filaments, settings }) {
  const stats = useMemo(() => {
    const openOrders = orders.filter(o => o.status !== 'Afgerond').length;
    const readyOrders = orders.filter(o => o.status === 'Gereed').length;
    let totalRevenue = 0;
    let totalCost = 0;

    orders.forEach(order => {
      const qty = Number(order.quantity) || 1;
      totalRevenue += (Number(order.price) || 0) * qty;

      const prod = products.find(p => p.id === order.productId);
      if (prod) {
        const fil = filaments.find(f => f.id === prod.defaultFilamentId);
        const filCost = fil ? (prod.weight / fil.totalWeight) * fil.price : 0;
        const energyCost = (prod.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
        totalCost += (filCost + energyCost) * qty;
      }
    });

    const criticalFilaments = filaments.filter(f => f.status === 'actief' && ((f.totalWeight - (f.usedWeight || 0)) / f.totalWeight) < 0.15);

    return { openOrders, readyOrders, totalRevenue, totalProfit: totalRevenue - totalCost, activePrints: orders.filter(o => o.status === 'Printen').length, criticalFilaments };
  }, [orders, products, filaments, settings]);

  return (
    <div className="space-y-10">
      {stats.criticalFilaments.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-[2.5rem] flex items-center gap-6 animate-pulse shadow-lg shadow-rose-100">
          <div className="bg-rose-500 p-4 rounded-3xl text-white shadow-lg shadow-rose-200">
            <AlertTriangle size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-black text-rose-900 uppercase tracking-tight">Kritieke Voorraad!</h2>
            <p className="text-rose-700 font-bold">Bestel filament voor: {stats.criticalFilaments.map(f => `${f.brand} ${f.colorName}`).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard title="Open Orders" value={stats.openOrders} icon={<Clock className="text-amber-500" />} color="bg-amber-50" />
        <StatCard title="Actief Printen" value={stats.activePrints} icon={<Printer className="text-purple-500" />} color="bg-purple-50" />
        <StatCard title="Klaar voor Afhaal" value={stats.readyOrders} icon={<CheckCircle2 className="text-emerald-600" />} color="bg-emerald-50" />
        <StatCard title="Totale Omzet" value={`€${stats.totalRevenue.toFixed(2)}`} icon={<TrendingUp className="text-blue-500" />} color="bg-blue-50" />
        <StatCard title="Geschatte Winst" value={`€${stats.totalProfit.toFixed(2)}`} icon={<Euro className="text-indigo-600" />} color="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-800 uppercase tracking-tight">
            <Clock size={24} className="text-blue-600" /> Recente Orders
          </h2>
          <div className="space-y-4">
            {orders.length === 0 ? <p className="text-slate-400 italic">Geen data beschikbaar.</p> : orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-3xl border border-transparent transition-all">
                <div>
                  <p className="font-bold text-slate-900 text-lg leading-tight">{order.customer}</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                    {order.quantity}x {products.find(p => p.id === order.productId)?.name || 'Onbekend'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-blue-600 text-lg">€{(Number(order.price) * (order.quantity || 1)).toFixed(2)}</p>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${order.status === 'Gereed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-800 uppercase tracking-tight">
            <Database size={24} className="text-blue-600" /> Filament Status
          </h2>
          <div className="space-y-8">
            {filaments.filter(f => f.status === 'actief').map(fil => {
              const rem = fil.totalWeight - (fil.usedWeight || 0);
              const perc = (rem / fil.totalWeight) * 100;
              return (
                <div key={fil.id} className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <div>
                      <p className="font-black text-slate-800 text-base leading-none">{fil.brand}</p>
                      <p className="text-xs text-slate-400 font-bold mt-1.5 uppercase tracking-wider">{fil.colorName}</p>
                    </div>
                    <p className={`text-sm font-black ${perc < 15 ? 'text-rose-500' : 'text-slate-600'}`}>{Math.round(rem)}g ({Math.round(perc)}%)</p>
                  </div>
                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200 p-1">
                    <div className={`h-full transition-all duration-1000 rounded-full ${perc < 15 ? 'bg-rose-500 animate-pulse' : 'bg-blue-600'}`} style={{ width: `${Math.max(0, perc)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center gap-4 hover:shadow-xl hover:shadow-blue-50/50 transition-all duration-300">
      <div className={`p-4 ${color} rounded-3xl`}>{icon}</div>
      <div>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mb-1">{title}</p>
        <p className="text-2xl xl:text-3xl font-black text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  );
}

function OrderList({ orders, products, filaments, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ customer: '', messengerLink: '', productId: '', price: '', quantity: 1, status: 'In de wacht', comments: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('orders', { ...formData, price: Number(formData.price), quantity: Number(formData.quantity) });
    setShowModal(false);
    setFormData({ customer: '', messengerLink: '', productId: '', price: '', quantity: 1, status: 'In de wacht', comments: '' });
  };

  return (
    <div className="space-y-8">
      <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-10 py-5 rounded-3xl flex items-center gap-4 font-black shadow-2xl shadow-blue-100 hover:scale-[1.03] transition-all">
        <Plus size={24} strokeWidth={4} /> BESTELLING TOEVOEGEN
      </button>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
            <tr>
              <th className="px-10 py-8">Klant</th>
              <th className="px-10 py-8">Product</th>
              <th className="px-10 py-8">Prijs</th>
              <th className="px-10 py-8">Status</th>
              <th className="px-10 py-8 text-right">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-bold">
            {[...orders].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => {
              const p = products.find(p => p.id === order.productId);
              return (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-900 text-xl font-black">{order.customer}</p>
                      {order.messengerLink && (
                        <a href={order.messengerLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded-lg">
                          <ExternalLink size={16} strokeWidth={2.5}/>
                        </a>
                      )}
                    </div>
                    {order.comments && <p className="text-[11px] text-slate-400 font-bold mt-1 italic">{order.comments}</p>}
                    <button onClick={() => { const n = prompt("Notitie:", order.comments); if(n!==null) onUpdate('orders', order.id, {comments: n}); }} className="text-[9px] uppercase text-slate-300 hover:text-blue-500 mt-2 block">+ Bewerk notitie</button>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-slate-800 text-lg">{p?.name || 'Onbekend'}</p>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{order.quantity} stuks</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-slate-900 text-xl font-black">€{(Number(order.price) * (order.quantity || 1)).toFixed(2)}</p>
                  </td>
                  <td className="px-10 py-8">
                    <select 
                      value={order.status} 
                      onChange={(e) => onUpdate('orders', order.id, { status: e.target.value })} 
                      className={`border-2 rounded-2xl px-5 py-2.5 text-[10px] uppercase font-black cursor-pointer outline-none transition-all ${
                        order.status === 'Afgerond' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
                        order.status === 'Gereed' ? 'bg-blue-50 border-blue-100 text-blue-700' : 
                        'bg-white border-slate-100'
                      }`}
                    >
                      {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button onClick={() => onDelete('orders', order.id)} className="text-slate-200 hover:text-rose-500 p-3 bg-slate-50 rounded-2xl"><Trash2 size={22} strokeWidth={2.5}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-3xl font-black mb-10 text-slate-900 uppercase">Nieuwe Order</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input required placeholder="Klantnaam" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-bold text-lg" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} />
              <select required className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-bold text-lg" value={formData.productId} onChange={e => {
                const pId = e.target.value;
                const p = products.find(prod => prod.id === pId);
                setFormData({...formData, productId: pId, price: p?.suggestedPrice || ''});
              }}>
                <option value="">Kies product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input placeholder="Messenger Link" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-bold" value={formData.messengerLink} onChange={e => setFormData({...formData, messengerLink: e.target.value})} />
              <div className="grid grid-cols-2 gap-6">
                <input required type="number" min="1" placeholder="Aantal" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-black text-2xl" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                <input required type="number" step="0.01" placeholder="Prijs (€)" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-black text-2xl" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <textarea rows="3" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-bold text-slate-700" placeholder="Opmerkingen..." value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} />
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase">Annuleren</button>
                <button type="submit" className="flex-1 py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-blue-200">OPSLAAN</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductList({ products, filaments, settings, onAdd, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', weight: '', printTime: '', defaultFilamentId: '', suggestedPrice: '' });

  const calculateCosts = (p) => {
    const fil = filaments.find(f => f.id === p.defaultFilamentId);
    const filCost = fil ? (p.weight / fil.totalWeight) * fil.price : 0;
    const energyCost = (p.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
    return { fil: filCost, energy: energyCost, total: filCost + energyCost };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('products', { ...formData, weight: Number(formData.weight), printTime: Number(formData.printTime), suggestedPrice: Number(formData.suggestedPrice) });
    setShowModal(false);
    setFormData({ name: '', weight: '', printTime: '', defaultFilamentId: '', suggestedPrice: '' });
  };

  return (
    <div className="space-y-8">
      <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-10 py-5 rounded-3xl flex items-center gap-4 font-black shadow-lg shadow-blue-100">
        <Plus size={24} strokeWidth={4} /> NIEUW PRODUCT
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {products.map(product => {
          const costs = calculateCosts(product);
          return (
            <div key={product.id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 group relative transition-all hover:shadow-xl hover:-translate-y-1">
              <h3 className="text-2xl font-black mb-2 text-slate-900">{product.name}</h3>
              <div className="flex gap-4 mb-10 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                <span>{product.weight}g</span>
                <span>{product.printTime}m</span>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Kostprijs</p>
                  <p className="text-xl font-black">€{costs.total.toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-blue-400 uppercase">Verkoop</p>
                  <p className="text-xl font-black text-blue-600">€{(product.suggestedPrice || 0).toFixed(2)}</p>
                </div>
              </div>
              <button onClick={() => onDelete('products', product.id)} className="absolute top-8 right-8 text-slate-100 hover:text-rose-500 p-2"><Trash2 size={22}/></button>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl">
            <h2 className="text-3xl font-black mb-10 tracking-tight uppercase">Product Toevoegen</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input required placeholder="Naam" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-6">
                <input required type="number" placeholder="Gewicht (g)" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-bold" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                <input required type="number" placeholder="Tijd (min)" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-bold" value={formData.printTime} onChange={e => setFormData({...formData, printTime: e.target.value})} />
              </div>
              <select className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-bold" value={formData.defaultFilamentId} onChange={e => setFormData({...formData, defaultFilamentId: e.target.value})}>
                <option value="">Filament...</option>
                {filaments.filter(f => f.status === 'actief').map(f => <option key={f.id} value={f.id}>{f.brand} {f.colorName}</option>)}
              </select>
              <input required type="number" step="0.01" placeholder="Verkoopprijs (€)" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-black text-2xl" value={formData.suggestedPrice} onChange={e => setFormData({...formData, suggestedPrice: e.target.value})} />
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase">Annuleren</button>
                <button type="submit" className="flex-1 py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-blue-100">OPSLAAN</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StockList({ filaments, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ brand: '', colorName: '', colorCode: '#3b82f6', totalWeight: 1000, price: '' });
  const [showArchived, setShowArchived] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('filaments', { ...formData, usedWeight: 0, price: Number(formData.price), status: 'actief' });
    setShowModal(false);
    setFormData({ brand: '', colorName: '', colorCode: '#3b82f6', totalWeight: 1000, price: '' });
  };

  const activeFilaments = filaments.filter(f => (showArchived ? f.status === 'leeg' : f.status === 'actief'));

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-10 py-5 rounded-3xl flex items-center gap-4 font-black shadow-xl shadow-blue-100">
          <Plus size={24} strokeWidth={4} /> NIEUWE ROL
        </button>
        <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-100 rounded-[2rem] font-black text-[10px] uppercase text-slate-400">
          {showArchived ? 'Actieve Rollen' : 'Lege Rollen'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {activeFilaments.map(fil => {
          const rem = fil.totalWeight - (fil.usedWeight || 0);
          const perc = (rem / fil.totalWeight) * 100;
          const isLow = perc < 15 && fil.status === 'actief';

          return (
            <div key={fil.id} className={`bg-white p-10 rounded-[3.5rem] border-2 transition-all relative group shadow-sm hover:shadow-xl ${isLow ? 'border-rose-200' : 'border-slate-100'}`}>
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">{fil.brand}</h3>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-100 shadow-sm" style={{ backgroundColor: fil.colorCode }}></div>
                    {fil.colorName} • €{fil.price?.toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => onDelete('filaments', fil.id)} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 size={20}/></button>
                  {fil.status === 'actief' && (
                    <button onClick={() => onUpdate('filaments', fil.id, { status: 'leeg' })} className="text-slate-300 hover:text-blue-500 p-2"><Archive size={20}/></button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4 mb-10">
                <div className="flex justify-between items-end px-1">
                   <p className={`text-[10px] font-black uppercase tracking-widest ${isLow ? 'text-rose-500' : 'text-slate-400'}`}>Resterend</p>
                   <p className="text-base font-black">{Math.round(rem)}g / {fil.totalWeight}g</p>
                </div>
                <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden border border-slate-200 p-1.5 shadow-inner">
                  <div className={`h-full transition-all duration-1000 rounded-full ${isLow ? 'bg-rose-500 animate-pulse' : 'bg-blue-600'}`} style={{ width: `${Math.max(0, perc)}%` }}></div>
                </div>
              </div>

              {fil.status === 'actief' && (
                <div className="bg-slate-50 p-5 rounded-[2rem] flex items-center gap-4 border-2 border-transparent focus-within:border-blue-100 transition-all shadow-inner">
                   <Hash size={20} className="text-blue-500 shrink-0" />
                   <input type="number" placeholder="Verbruik (g) + Enter" className="w-full bg-transparent outline-none font-black text-slate-800 text-sm" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value) { onUpdate('filaments', fil.id, { usedWeight: (fil.usedWeight || 0) + Number(e.target.value) }); e.target.value = ''; } }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl">
            <h2 className="text-3xl font-black mb-10 tracking-tight uppercase">Rol Toevoegen</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input required placeholder="Merk" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-bold text-lg" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
              <input required placeholder="Kleur" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-bold text-lg" value={formData.colorName} onChange={e => setFormData({...formData, colorName: e.target.value})} />
              <div className="grid grid-cols-2 gap-6">
                <input required type="number" step="0.01" placeholder="Prijs (€)" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-black text-xl text-center" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                <input required type="color" className="w-full h-[68px] p-2 bg-slate-50 rounded-3xl cursor-pointer" value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} />
              </div>
              <div className="flex gap-6 pt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase">Annuleren</button>
                <button type="submit" className="flex-1 py-6 bg-blue-600 text-white rounded-[1.5rem] font-black text-xl shadow-xl shadow-blue-200">OPSLAAN</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ settings, onSave }) {
  const [temp, setTemp] = useState(settings);
  return (
    <div className="max-w-xl bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-12">
      <div className="flex items-center gap-6 text-blue-600">
        <div className="bg-blue-50 p-5 rounded-[2rem] shadow-sm"><Zap size={40} strokeWidth={3} /></div>
        <h2 className="text-3xl font-black uppercase tracking-tight">Kosten Beheer</h2>
      </div>
      <div className="space-y-10">
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Energieprijs (€ per kWh)</label>
          <input type="number" step="0.01" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] outline-none font-black text-3xl text-center" value={temp.kwhPrice} onChange={e => setTemp({...temp, kwhPrice: Number(e.target.value)})} />
        </div>
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Printer Verbruik (W)</label>
          <input type="number" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] outline-none font-black text-3xl text-center" value={temp.printerWattage} onChange={e => setTemp({...temp, printerWattage: Number(e.target.value)})} />
        </div>
        <button onClick={() => onSave(temp)} className="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all">BIJWERKEN</button>
      </div>
    </div>
  );
}