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
  ChevronRight
} from 'lucide-react';

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
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        setErrorMessage("Verbinding met Firebase mislukt.");
        setLoading(false);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const getPath = (name) => collection(db, 'artifacts', hubId, 'public', 'data', name);

    const unsubOrders = onSnapshot(query(getPath('orders')), 
      (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setErrorMessage(null);
        setLoading(false);
      }, 
      (err) => {
        if (err.code === 'permission-denied') {
          setErrorMessage("Toegang geweigerd. Zorg dat de Firebase Rules op 'if true' staan.");
        }
        setLoading(false);
      }
    );

    const unsubProducts = onSnapshot(query(getPath('products')), 
      (snapshot) => setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (err) => console.error(err)
    );

    const unsubFilaments = onSnapshot(query(getPath('filaments')), 
      (snapshot) => setFilaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (err) => console.error(err)
    );

    const unsubSettings = onSnapshot(doc(db, 'artifacts', hubId, 'public', 'data', 'settings', 'global'), 
      (docSnap) => {
        if (docSnap.exists()) setSettings(docSnap.data());
      }, 
      (err) => console.error(err)
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
          await addDoc(collection(db, 'artifacts', hubId, 'public', 'data', coll), {
            ...singleData, status: 'actief', createdAt: new Date().toISOString()
          });
        }
      } else {
        await addDoc(collection(db, 'artifacts', hubId, 'public', 'data', coll), {
          ...data, status: data.status || 'actief', createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateItem = async (coll, id, data) => {
    if (!user) return;
    try { await updateDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id), data); } catch (e) {}
  };

  const deleteItem = async (coll, id) => {
    if (!user) return;
    try { await deleteDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id)); } catch (e) {}
  };

  const saveSettings = async (data) => {
    if (!user) return;
    try { await setDoc(doc(db, 'artifacts', hubId, 'public', 'data', 'settings', 'global'), data); } catch (e) {}
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data ophalen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFE] flex flex-col md:flex-row font-sans text-slate-900">
      <nav className="w-full md:w-80 bg-white border-r border-slate-200 p-8 flex flex-col gap-2 shadow-sm z-20">
        <div className="text-2xl font-black text-purple-600 mb-12 flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-2xl text-purple-600">
            <Printer size={28} strokeWidth={3} />
          </div>
          3D Hub
        </div>
        
        <div className="flex flex-col gap-1 flex-1">
          {Object.values(TABS).map(tab => {
            const isActive = activeTab === tab;
            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-200 border-0 outline-none ring-0 focus:ring-0 focus:outline-none ${
                  isActive 
                    ? 'bg-purple-600 text-white shadow-xl shadow-purple-100 font-bold translate-x-1' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {tab === TABS.DASHBOARD && <LayoutDashboard size={20} />}
                {tab === TABS.ORDERS && <ShoppingCart size={20} />}
                {tab === TABS.CATALOG && <Package size={20} />}
                {tab === TABS.STOCK && <Database size={20} />}
                {tab === TABS.SETTINGS && <Settings size={20} />}
                <span className="text-sm tracking-tight">{tab}</span>
              </button>
            );
          })}
        </div>
        
        {errorMessage && (
          <div className="mt-auto p-6 bg-rose-50 border border-rose-100 rounded-[2rem] text-rose-600 text-[10px] font-bold leading-relaxed flex items-start gap-3">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}
      </nav>

      <main className="flex-1 p-6 md:p-14 overflow-auto bg-[#FDFCFE]">
        <header className="mb-12">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">{activeTab}</h1>
          <div className="h-1.5 w-24 bg-purple-600 mt-4 rounded-full shadow-lg shadow-purple-100"></div>
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
        let materialCostForOne = 0;
        const linkedFilaments = filaments.filter(f => prod.filamentIds?.includes(f.id));
        
        if (linkedFilaments.length > 0) {
          const weightPerFilament = prod.weight / linkedFilaments.length;
          linkedFilaments.forEach(f => {
            materialCostForOne += (weightPerFilament / (f.totalWeight || 1000)) * f.price;
          });
        }
        
        const energyCost = (prod.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
        totalCost += (materialCostForOne + energyCost) * qty;
      }
    });

    const criticalFilaments = filaments.filter(f => f.status === 'actief' && ((f.totalWeight - (f.usedWeight || 0)) / (f.totalWeight || 1)) < 0.15);

    return { openOrders, readyOrders, totalRevenue, totalProfit: totalRevenue - totalCost, activePrints: orders.filter(o => o.status === 'Printen').length, criticalFilaments };
  }, [orders, products, filaments, settings]);

  return (
    <div className="space-y-12">
      {stats.criticalFilaments.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 p-8 rounded-[3rem] flex items-center gap-8 shadow-2xl shadow-rose-100/50">
          <div className="bg-rose-500 p-5 rounded-[2rem] text-white shadow-lg shadow-rose-200">
            <AlertTriangle size={36} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-rose-900 uppercase tracking-tight italic">Voorraad Alert!</h2>
            <p className="text-rose-700 font-bold text-lg">Bijna op: {stats.criticalFilaments.map(f => `${f.brand} ${f.colorName}`).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
        <StatCard title="Open Orders" value={stats.openOrders} icon={<Clock className="text-orange-500" />} color="bg-orange-50" />
        <StatCard title="Nu Printen" value={stats.activePrints} icon={<Printer className="text-purple-500" />} color="bg-purple-50" />
        <StatCard title="Klaar" value={stats.readyOrders} icon={<CheckCircle2 className="text-emerald-600" />} color="bg-emerald-50" />
        <StatCard title="Omzet" value={`€${stats.totalRevenue.toFixed(2)}`} icon={<TrendingUp className="text-purple-500" />} color="bg-purple-50" />
        <StatCard title="Winst" value={`€${stats.totalProfit.toFixed(2)}`} icon={<Euro className="text-indigo-600" />} color="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100">
          <h2 className="text-2xl font-black mb-10 flex items-center gap-4 text-slate-800 uppercase tracking-tight italic">
            <Clock size={28} className="text-purple-600" /> Recente Orders
          </h2>
          <div className="space-y-6">
            {orders.length === 0 ? <p className="text-slate-400 italic text-center py-12">Geen orders gevonden.</p> : orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-[2.5rem] border border-transparent hover:border-purple-100 transition-all">
                <div>
                  <p className="font-black text-slate-900 text-xl leading-tight">{order.customer}</p>
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-2">
                    {order.quantity}x {products.find(p => p.id === order.productId)?.name || 'Onbekend'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-purple-600 text-2xl tracking-tighter">€{(Number(order.price) * (order.quantity || 1)).toFixed(2)}</p>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full mt-2 inline-block ${order.status === 'Gereed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100">
          <h2 className="text-2xl font-black mb-10 flex items-center gap-4 text-slate-800 uppercase tracking-tight italic">
            <Database size={28} className="text-purple-600" /> Filament Status
          </h2>
          <div className="space-y-10">
            {filaments.filter(f => f.status === 'actief').map(fil => {
              const rem = fil.totalWeight - (fil.usedWeight || 0);
              const perc = (rem / (fil.totalWeight || 1)) * 100;
              return (
                <div key={fil.id} className="space-y-4">
                  <div className="flex justify-between items-end px-2">
                    <div>
                      <div className="flex items-center gap-3">
                         <p className="font-black text-slate-800 text-lg leading-none">{fil.brand}</p>
                         <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg font-black uppercase tracking-widest">{fil.materialType || 'PLA'}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">{fil.colorName}</p>
                    </div>
                    <p className={`text-base font-black ${perc < 15 ? 'text-rose-500 animate-pulse' : 'text-slate-600'}`}>{Math.round(rem)}g ({Math.round(perc)}%)</p>
                  </div>
                  <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden border border-slate-200 p-1.5 shadow-inner">
                    <div className={`h-full transition-all duration-1000 rounded-full ${perc < 15 ? 'bg-rose-500 shadow-lg shadow-rose-200' : 'bg-purple-600 shadow-lg shadow-purple-100'}`} style={{ width: `${Math.max(0, perc)}%` }}></div>
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
    <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center gap-6 hover:shadow-2xl hover:shadow-purple-100/30 transition-all duration-500 group">
      <div className={`p-5 ${color} rounded-[2rem] transition-transform group-hover:scale-110 shadow-sm`}>{icon}</div>
      <div>
        <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">{title}</p>
        <p className="text-3xl font-black text-slate-900 leading-none tracking-tighter italic">{value}</p>
      </div>
    </div>
  );
}

function OrderList({ orders, products, filaments, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    customer: '', messengerLink: '', productId: '', price: '', quantity: 1, 
    status: 'In de wacht', comments: '', orderDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('orders', { ...formData, price: Number(formData.price), quantity: Number(formData.quantity) });
    setShowModal(false);
    setFormData({ customer: '', messengerLink: '', productId: '', price: '', quantity: 1, status: 'In de wacht', comments: '', orderDate: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-10">
      <button 
        onClick={() => setShowModal(true)} 
        className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-6 rounded-[2.5rem] flex items-center gap-5 font-black shadow-2xl shadow-purple-200 hover:scale-[1.03] active:scale-[0.97] transition-all border-0 outline-none ring-0 italic tracking-tight"
      >
        <Plus size={28} strokeWidth={4} /> BESTELLING INVOEREN
      </button>

      <div className="bg-white rounded-[4rem] shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-slate-50/50 text-slate-400 text-[11px] uppercase font-black tracking-[0.3em]">
            <tr>
              <th className="px-10 py-10">Klant & Datum</th>
              <th className="px-10 py-10">Product Info</th>
              <th className="px-10 py-10">Financieel</th>
              <th className="px-10 py-10">Status</th>
              <th className="px-10 py-10 text-right">Beheer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-bold">
            {[...orders].sort((a,b) => new Date(b.orderDate || b.createdAt) - new Date(a.orderDate || a.createdAt)).map(order => {
              const p = products.find(p => p.id === order.productId);
              return (
                <tr key={order.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-10 py-10">
                    <div className="flex items-center gap-3 text-slate-400 mb-2">
                       <Calendar size={14}/>
                       <span className="text-[10px] uppercase font-black tracking-widest">{order.orderDate || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-slate-900 text-2xl font-black italic tracking-tight">{order.customer}</p>
                      {order.messengerLink && (
                        <a href={order.messengerLink} target="_blank" rel="noreferrer" className="text-purple-500 hover:text-purple-700 bg-purple-50 p-2 rounded-xl">
                          <ExternalLink size={18} strokeWidth={2.5}/>
                        </a>
                      )}
                    </div>
                    {order.comments && <p className="text-xs text-slate-400 font-medium mt-2 italic">"{order.comments}"</p>}
                  </td>
                  <td className="px-10 py-10">
                    <p className="text-slate-800 text-xl font-black">{p?.name || 'Onbekend'}</p>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] mt-1">{order.quantity} Stuks</p>
                  </td>
                  <td className="px-10 py-10">
                    <p className="text-slate-900 text-2xl font-black tracking-tighter">€{(Number(order.price) * (order.quantity || 1)).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-black mt-1">€{Number(order.price).toFixed(2)} p/s</p>
                  </td>
                  <td className="px-10 py-10">
                    <select 
                      value={order.status} 
                      onChange={(e) => onUpdate('orders', order.id, { status: e.target.value })} 
                      className={`border-2 rounded-[1.5rem] px-6 py-3 text-[11px] uppercase font-black cursor-pointer outline-none transition-all ${
                        order.status === 'Afgerond' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
                        order.status === 'Gereed' ? 'bg-purple-50 border-purple-100 text-purple-700' : 
                        'bg-white border-slate-100 focus:border-purple-300 shadow-sm'
                      }`}
                    >
                      {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-10 py-10 text-right">
                    <button onClick={() => onDelete('orders', order.id)} className="text-slate-200 hover:text-rose-500 p-4 bg-slate-50/50 rounded-3xl transition-all border-0 outline-none ring-0 shadow-none"><Trash2 size={24} strokeWidth={2.5}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-2xl flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[4rem] p-12 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100">
            <h2 className="text-4xl font-black mb-12 text-slate-900 uppercase italic tracking-tighter">Nieuwe Bestelling</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Besteldatum</label>
                <input required type="date" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Klant</label>
                  <input required placeholder="Naam klant..." className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Product</label>
                  <select required className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner appearance-none" value={formData.productId} onChange={e => {
                    const pId = e.target.value;
                    const p = products.find(prod => prod.id === pId);
                    setFormData({...formData, productId: pId, price: p?.suggestedPrice || ''});
                  }}>
                    <option value="">Kies product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <input placeholder="Messenger Link (optioneel)" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold shadow-inner" value={formData.messengerLink} onChange={e => setFormData({...formData, messengerLink: e.target.value})} />
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3 text-center">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Aantal</label>
                  <input required type="number" min="1" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-black text-3xl text-center shadow-inner" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
                <div className="space-y-3 text-center">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Prijs (€)</label>
                  <input required type="number" step="0.01" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-black text-3xl text-center shadow-inner" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>
              <textarea rows="3" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-slate-700 shadow-inner" placeholder="Extra opmerkingen..." value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} />
              <div className="flex gap-8 pt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-6 text-slate-400 font-black uppercase tracking-[0.2em] text-xs border-0 outline-none ring-0">Annuleren</button>
                <button type="submit" className="flex-1 py-7 bg-purple-600 hover:bg-purple-700 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-purple-200 border-0 outline-none ring-0 italic">OPSLAAN</button>
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
  const [formData, setFormData] = useState({ name: '', weight: '', printTime: '', filamentIds: [], suggestedPrice: '' });

  const calculateCosts = (p) => {
    let materialCost = 0;
    const linkedFilaments = filaments.filter(f => p.filamentIds?.includes(f.id));
    if (linkedFilaments.length > 0) {
      const weightPerFil = p.weight / linkedFilaments.length;
      linkedFilaments.forEach(f => {
        materialCost += (weightPerFil / (f.totalWeight || 1000)) * f.price;
      });
    }
    const energyCost = (p.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
    return { fil: materialCost, energy: energyCost, total: materialCost + energyCost };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('products', { ...formData, weight: Number(formData.weight), printTime: Number(formData.printTime), suggestedPrice: Number(formData.suggestedPrice) });
    setShowModal(false);
    setFormData({ name: '', weight: '', printTime: '', filamentIds: [], suggestedPrice: '' });
  };

  const toggleFilament = (id) => {
    setFormData(prev => ({
      ...prev,
      filamentIds: prev.filamentIds.includes(id) 
        ? prev.filamentIds.filter(fid => fid !== id)
        : [...prev.filamentIds, id]
    }));
  };

  return (
    <div className="space-y-12">
      <button 
        onClick={() => setShowModal(true)} 
        className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-6 rounded-[2.5rem] flex items-center gap-5 font-black shadow-2xl shadow-purple-200 hover:scale-[1.03] active:scale-[0.97] transition-all border-0 outline-none ring-0 italic tracking-tight"
      >
        <Plus size={28} strokeWidth={4} /> NIEUW PRODUCT
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {products.map(product => {
          const costs = calculateCosts(product);
          return (
            <div key={product.id} className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 group relative transition-all hover:shadow-2xl hover:-translate-y-2">
              <h3 className="text-3xl font-black mb-3 text-slate-900 italic tracking-tighter">{product.name}</h3>
              <div className="flex gap-6 mb-8 text-[11px] font-black uppercase text-slate-400 tracking-[0.25em]">
                <span>{product.weight}g</span>
                <span>{product.printTime}m</span>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-10">
                {product.filamentIds?.map(fid => {
                  const f = filaments.find(fil => fil.id === fid);
                  return f ? (
                    <div key={fid} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                      <div className="w-3.5 h-3.5 rounded-full shadow-inner" style={{ backgroundColor: f.colorCode }}></div>
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{f.brand}</span>
                    </div>
                  ) : null;
                })}
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-50 p-6 rounded-[2.5rem] text-center shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kost</p>
                  <p className="text-2xl font-black tracking-tighter text-slate-800">€{costs.total.toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-[2.5rem] text-center shadow-inner">
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Verkoop</p>
                  <p className="text-2xl font-black text-purple-600 tracking-tighter">€{(product.suggestedPrice || 0).toFixed(2)}</p>
                </div>
              </div>
              <button onClick={() => onDelete('products', product.id)} className="absolute top-10 right-10 text-slate-100 hover:text-rose-500 p-3 border-0 outline-none ring-0 shadow-none transition-colors"><Trash2 size={24}/></button>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-2xl flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[4rem] p-12 w-full max-xl shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100">
            <h2 className="text-4xl font-black mb-12 tracking-tighter uppercase text-slate-900 italic">Catalogus Item</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                 <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Naam Product</label>
                 <input required placeholder="Bijv. Flexi-Rex..." className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                   <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Gewicht (g)</label>
                   <input required type="number" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                </div>
                <div className="space-y-3">
                   <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Tijd (min)</label>
                   <input required type="number" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner" value={formData.printTime} onChange={e => setFormData({...formData, printTime: e.target.value})} />
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Filamenten</label>
                <div className="grid grid-cols-2 gap-4 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-[2rem] shadow-inner">
                  {filaments.filter(f => f.status === 'actief').map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFilament(f.id)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-0 ring-0 outline-none transition-all text-left shadow-none ${
                        formData.filamentIds.includes(f.id) 
                          ? 'bg-purple-100 text-purple-900 ring-2 ring-purple-500' 
                          : 'bg-white shadow-sm'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full shadow-inner border border-slate-100" style={{ backgroundColor: f.colorCode }}></div>
                      <div className="flex-1 truncate">
                        <p className="text-[10px] font-black uppercase leading-none tracking-tight">{f.brand}</p>
                        <p className="text-[9px] text-slate-400 font-bold truncate mt-1">{f.colorName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 text-center block tracking-widest">Aanbevolen Verkoopprijs (€)</label>
                <input required type="number" step="0.01" className="w-full p-7 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2.5rem] outline-none font-black text-4xl text-center shadow-inner" value={formData.suggestedPrice} onChange={e => setFormData({...formData, suggestedPrice: e.target.value})} />
              </div>
              
              <div className="flex gap-8 pt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-6 text-slate-400 font-black uppercase tracking-widest text-xs border-0 outline-none ring-0">Annuleren</button>
                <button type="submit" className="flex-1 py-7 bg-purple-600 hover:bg-purple-700 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-purple-200 border-0 outline-none ring-0 italic">OPSLAAN</button>
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
  const [modalMode, setModalMode] = useState('add'); 
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    brand: '', materialType: '', colorName: '', colorCode: '#9333ea', totalWeight: 1000, 
    price: '', totalPrice: '', quantity: 1, 
    purchaseDate: new Date().toISOString().split('T')[0], shopName: ''
  });
  const [showArchived, setShowArchived] = useState(false);

  const handlePriceChange = (field, value) => {
    const val = Number(value);
    if (field === 'price') {
      setFormData(prev => ({ ...prev, price: val, totalPrice: Number((val * prev.quantity).toFixed(2)) }));
    } else if (field === 'totalPrice') {
      setFormData(prev => ({ ...prev, totalPrice: val, price: Number((val / prev.quantity).toFixed(2)) }));
    } else if (field === 'quantity') {
      const q = Number(value);
      setFormData(prev => ({ ...prev, quantity: q, totalPrice: Number((prev.price * q).toFixed(2)) }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modalMode === 'edit') {
      onUpdate('filaments', editingId, { 
        brand: formData.brand, materialType: formData.materialType, colorName: formData.colorName,
        colorCode: formData.colorCode, totalWeight: Number(formData.totalWeight),
        price: Number(formData.price), purchaseDate: formData.purchaseDate, shopName: formData.shopName
      });
    } else {
      onAdd('filaments', { ...formData, usedWeight: 0, price: Number(formData.price), totalWeight: Number(formData.totalWeight), status: 'actief' });
    }
    setShowModal(false);
  };

  const openModal = (mode, item = null) => {
    setModalMode(mode);
    if (item) {
      setEditingId(item.id);
      setFormData({
        brand: item.brand, materialType: item.materialType, colorName: item.colorName, colorCode: item.colorCode,
        totalWeight: item.totalWeight, price: item.price, totalPrice: item.price, quantity: 1,
        purchaseDate: item.purchaseDate || new Date().toISOString().split('T')[0], shopName: item.shopName || ''
      });
    } else {
      setFormData({ brand: '', materialType: '', colorName: '', colorCode: '#9333ea', totalWeight: 1000, price: '', totalPrice: '', quantity: 1, purchaseDate: new Date().toISOString().split('T')[0], shopName: '' });
    }
    setShowModal(true);
  };

  const activeFilaments = filaments.filter(f => (showArchived ? f.status === 'leeg' : f.status === 'actief'));

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <button 
          onClick={() => openModal('add')} 
          className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-6 rounded-[2.5rem] flex items-center gap-5 font-black shadow-2xl shadow-purple-200 hover:scale-[1.03] active:scale-[0.97] transition-all border-0 outline-none italic"
        >
          <Plus size={28} strokeWidth={4} /> NIEUWE ROL
        </button>
        <button 
          onClick={() => setShowArchived(!showArchived)} 
          className="flex items-center gap-4 px-10 py-5 bg-white border-2 border-slate-100 rounded-[2.5rem] font-black text-xs uppercase tracking-widest text-slate-400 transition-all hover:border-purple-200 hover:text-purple-600 outline-none border-0 ring-0 shadow-sm"
        >
          {showArchived ? 'Actieve Rollen' : 'Archief (Leeg)'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {activeFilaments.map(fil => {
          const rem = fil.totalWeight - (fil.usedWeight || 0);
          const perc = (rem / (fil.totalWeight || 1)) * 100;
          const isLow = perc < 15 && fil.status === 'actief';

          return (
            <div key={fil.id} className={`bg-white p-12 rounded-[4rem] border-2 transition-all relative group shadow-sm hover:shadow-2xl ${isLow ? 'border-rose-200 shadow-rose-50' : 'border-slate-50'}`}>
              <div className="flex justify-between items-start mb-10">
                <div className="min-w-0 flex-1 pr-4">
                  <div className="flex items-center gap-3 mb-2">
                     <h3 className="text-2xl font-black text-slate-900 leading-tight italic truncate">{fil.brand}</h3>
                     <span className="shrink-0 text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded-xl font-black uppercase tracking-widest">{fil.materialType || 'PLA'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-black uppercase text-slate-400 tracking-widest mb-4">
                    <div className="w-5 h-5 rounded-full border border-slate-100 shadow-sm" style={{ backgroundColor: fil.colorCode }}></div>
                    {fil.colorName} • €{fil.price?.toFixed(2)}
                  </div>
                  <div className="flex flex-wrap gap-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                     <span className="flex items-center gap-1.5"><Calendar size={14} className="text-purple-300"/> {fil.purchaseDate || 'N/A'}</span>
                     {fil.shopName && <span className="flex items-center gap-1.5"><Store size={14} className="text-purple-300"/> {fil.shopName}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal('edit', fil)} className="text-slate-300 hover:text-purple-600 p-2 border-0 outline-none ring-0 transition-colors"><Edit3 size={20}/></button>
                  <button onClick={() => openModal('copy', fil)} className="text-slate-300 hover:text-purple-600 p-2 border-0 outline-none ring-0 transition-colors"><Copy size={20}/></button>
                  <button onClick={() => onDelete('filaments', fil.id)} className="text-slate-300 hover:text-rose-500 p-2 border-0 outline-none ring-0 transition-colors"><Trash2 size={20}/></button>
                  {fil.status === 'actief' ? (
                    <button onClick={() => onUpdate('filaments', fil.id, { status: 'leeg' })} className="text-slate-300 hover:text-purple-500 p-2 border-0 outline-none ring-0 transition-colors"><Archive size={20}/></button>
                  ) : (
                    <button onClick={() => onUpdate('filaments', fil.id, { status: 'actief' })} className="text-slate-300 hover:text-emerald-500 p-2 border-0 outline-none ring-0 transition-colors"><RefreshCw size={20}/></button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4 mb-10">
                <div className="flex justify-between items-end px-2">
                   <p className={`text-[11px] font-black uppercase tracking-widest ${isLow ? 'text-rose-500' : 'text-slate-400'}`}>Resterend</p>
                   <p className="text-lg font-black tracking-tighter italic">{Math.round(rem)}g / {fil.totalWeight}g</p>
                </div>
                <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden border border-slate-200 p-1.5 shadow-inner">
                  <div className={`h-full transition-all duration-1000 rounded-full ${isLow ? 'bg-rose-500 animate-pulse' : 'bg-purple-600 shadow-lg shadow-purple-200'}`} style={{ width: `${Math.max(0, perc)}%` }}></div>
                </div>
              </div>

              {fil.status === 'actief' && (
                <div className="bg-slate-50 p-6 rounded-[2.5rem] flex items-center gap-5 border-2 border-transparent focus-within:border-purple-200 transition-all shadow-inner group-focus-within:shadow-none">
                   <Hash size={24} className="text-purple-500 shrink-0" />
                   <input type="number" placeholder="Verbruik invoeren..." className="w-full bg-transparent border-0 outline-none ring-0 font-black text-slate-800 text-base" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value) { onUpdate('filaments', fil.id, { usedWeight: (fil.usedWeight || 0) + Number(e.target.value) }); e.target.value = ''; } }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-2xl flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[4rem] p-12 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100">
            <h2 className="text-4xl font-black mb-10 tracking-tighter uppercase text-slate-900 italic">Voorraad Invoer</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Merk</label>
                  <input required placeholder="Bijv. eSun" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Materiaal</label>
                  <input required placeholder="Bijv. PLA+" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner uppercase" value={formData.materialType} onChange={e => setFormData({...formData, materialType: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Kleur Naam</label>
                  <input required placeholder="Bijv. Cold White" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner" value={formData.colorName} onChange={e => setFormData({...formData, colorName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Start Gewicht (g)</label>
                  <input required type="number" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner" value={formData.totalWeight} onChange={e => setFormData({...formData, totalWeight: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Besteldatum</label>
                  <input required type="date" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Webshop</label>
                  <input placeholder="Bijv. 123inkt" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner uppercase" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} />
                </div>
              </div>

              {modalMode !== 'edit' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-4">Aantal rollen (Bulk)</label>
                  <input required type="number" min="1" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-black text-3xl text-center shadow-inner" value={formData.quantity} onChange={e => handlePriceChange('quantity', e.target.value)} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 text-center block tracking-widest">Prijs p/s (€)</label>
                  <input required type="number" step="0.01" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-black text-3xl text-center shadow-inner" value={formData.price} onChange={e => handlePriceChange('price', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 text-center block tracking-widest">Totaal (€)</label>
                  <input required type="number" step="0.01" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-black text-3xl text-center shadow-inner" value={formData.totalPrice} onChange={e => handlePriceChange('totalPrice', e.target.value)} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 text-center block tracking-widest">Kleur Kies</label>
                <input required type="color" className="w-full h-20 p-2 bg-slate-50 rounded-[2rem] cursor-pointer shadow-inner" value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} />
              </div>

              <div className="flex gap-8 pt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-6 text-slate-400 font-black uppercase tracking-widest text-xs border-0 outline-none ring-0">Annuleren</button>
                <button type="submit" className="flex-1 py-7 bg-purple-600 hover:bg-purple-700 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-purple-200 border-0 outline-none ring-0 italic">
                  {modalMode === 'edit' ? 'BIJWERKEN' : 'OPSLAAN'}
                </button>
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
    <div className="max-w-xl bg-white p-16 rounded-[4rem] border border-slate-100 shadow-sm space-y-16">
      <div className="flex items-center gap-6 text-purple-600">
        <div className="bg-purple-50 p-6 rounded-[2.5rem] shadow-sm shadow-purple-100"><Zap size={44} strokeWidth={3} /></div>
        <h2 className="text-4xl font-black uppercase tracking-tight italic">Energie</h2>
      </div>
      <div className="space-y-12">
        <div className="space-y-4 text-center">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Prijs per kWh (€)</label>
          <input type="number" step="0.01" className="w-full p-8 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[3rem] outline-none font-black text-5xl text-center shadow-inner tracking-tighter" value={temp.kwhPrice} onChange={e => setTemp({...temp, kwhPrice: Number(e.target.value)})} />
        </div>
        <div className="space-y-4 text-center">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Printer Wattage (W)</label>
          <input type="number" className="w-full p-8 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[3rem] outline-none font-black text-5xl text-center shadow-inner tracking-tighter" value={temp.printerWattage} onChange={e => setTemp({...temp, printerWattage: Number(e.target.value)})} />
        </div>
        <button onClick={() => onSave(temp)} className="w-full py-10 bg-purple-600 hover:bg-purple-700 text-white rounded-[3rem] font-black text-3xl shadow-2xl shadow-purple-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-0 outline-none ring-0 italic">OPSLAAN</button>
      </div>
    </div>
  );
}