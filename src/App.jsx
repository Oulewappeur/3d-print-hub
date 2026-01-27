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
  CheckCircle2, 
  Calendar,
  Copy,
  Edit3
} from 'lucide-react';

/**
 * FIREBASE CONFIGURATIE
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

/**
 * FIREBASE SECURITY RULES INSTRUCTIE:
 * Kopieer de onderstaande regels naar je Firebase Console -> Firestore -> Rules:
 * * service cloud.firestore {
 * match /databases/{database}/documents {
 * match /artifacts/d-printer-orders-1b6f3/{document=**} {
 * allow read, write: if request.auth != null;
 * }
 * }
 * }
 */

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
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setErrorMessage("Authenticatie mislukt. Schakel 'Anonymous Auth' in in de Firebase Console.");
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

  useEffect(() => {
    if (!user) return;

    const getPath = (name) => collection(db, 'artifacts', hubId, 'public', 'data', name);

    const unsubOrders = onSnapshot(query(getPath('orders')), 
      (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, 
      (err) => {
        console.error("Orders sync error:", err);
        if (err.code === 'permission-denied') {
          setErrorMessage("Toegang geweigerd door Security Rules. Update je regels in de Firebase Console.");
        }
      }
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
    if (!user) {
      setErrorMessage("Niet verbonden. Kan niet opslaan.");
      return;
    }
    try {
      // Ondersteuning voor bulk filament toevoegen
      if (coll === 'filaments' && data.quantity > 1) {
        const { quantity, ...singleData } = data;
        for (let i = 0; i < quantity; i++) {
          await addDoc(collection(db, 'artifacts', hubId, 'public', 'data', coll), {
            ...singleData,
            status: 'actief',
            createdAt: new Date().toISOString()
          });
        }
      } else {
        await addDoc(collection(db, 'artifacts', hubId, 'public', 'data', coll), {
          ...data,
          status: data.status || 'actief',
          createdAt: new Date().toISOString()
        });
      }
      setErrorMessage(null);
    } catch (e) {
      console.error("Fout bij opslaan:", e);
      if (e.code === 'permission-denied') {
        setErrorMessage("Security Rules blokkeren het opslaan.");
      } else {
        setErrorMessage(`Opslaan mislukt: ${e.message}`);
      }
    }
  };

  const updateItem = async (coll, id, data) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id), data);
    } catch (e) {
      console.error("Fout bij updaten:", e);
    }
  };

  const deleteItem = async (coll, id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id));
    } catch (e) {
      console.error("Fout bij verwijderen:", e);
    }
  };

  const saveSettings = async (data) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', hubId, 'public', 'data', 'settings', 'global'), data);
    } catch (e) {
      console.error("Fout bij instellingen opslaan:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-black text-purple-600 uppercase tracking-widest">3D Hub laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFE] flex flex-col md:flex-row font-sans text-slate-900">
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-2 shadow-sm z-20">
        <div className="text-2xl font-black text-purple-600 mb-10 flex items-center gap-3 px-2">
          <div className="p-2 bg-purple-50 rounded-xl">
            <Printer size={28} strokeWidth={3} />
          </div>
          3D Hub
        </div>
        
        {Object.values(TABS).map(tab => {
          const isActive = activeTab === tab;
          return (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 border-none outline-none appearance-none ${
                isActive 
                  ? '!bg-purple-600 !text-white shadow-xl shadow-purple-200 font-bold translate-x-1' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              style={{
                backgroundColor: isActive ? '#9333ea' : 'transparent',
                color: isActive ? '#ffffff' : undefined
              }}
            >
              {tab === TABS.DASHBOARD && <LayoutDashboard size={20} />}
              {tab === TABS.ORDERS && <ShoppingCart size={20} />}
              {tab === TABS.CATALOG && <Package size={20} />}
              {tab === TABS.STOCK && <Database size={20} />}
              {tab === TABS.SETTINGS && <Settings size={20} />}
              {tab}
            </button>
          );
        })}
        
        <div className="mt-auto p-4 bg-slate-50 rounded-2xl text-[10px] text-slate-400 font-mono break-all border border-slate-100">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-bold uppercase tracking-widest">{user ? 'Online' : 'Offline'}</span>
          </div>
          Project: {hubId}
          {errorMessage && (
            <div className="mt-2 p-2 bg-red-100 text-red-600 rounded text-[9px] font-bold">
              <AlertTriangle size={10} className="inline mr-1 mb-0.5" />
              {errorMessage}
            </div>
          )}
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
        let materialCostForOne = 0;
        const linkedFilaments = filaments.filter(f => prod.filamentIds?.includes(f.id));
        
        if (linkedFilaments.length > 0) {
          const weightPerFilament = prod.weight / linkedFilaments.length;
          linkedFilaments.forEach(f => {
            materialCostForOne += (weightPerFilament / f.totalWeight) * f.price;
          });
        }
        
        const energyCost = (prod.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
        totalCost += (materialCostForOne + energyCost) * qty;
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
            <p className="text-rose-700 font-bold">Lage voorraad: {stats.criticalFilaments.map(f => `${f.brand} ${f.colorName}`).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard title="Open Orders" value={stats.openOrders} icon={<Clock className="text-orange-500" />} color="bg-orange-50" />
        <StatCard title="Actief Printen" value={stats.activePrints} icon={<Printer className="text-purple-500" />} color="bg-purple-50" />
        <StatCard title="Klaar voor Afhaal" value={stats.readyOrders} icon={<CheckCircle2 className="text-emerald-600" />} color="bg-emerald-50" />
        <StatCard title="Totale Omzet" value={`€${stats.totalRevenue.toFixed(2)}`} icon={<TrendingUp className="text-purple-500" />} color="bg-purple-50" />
        <StatCard title="Geschatte Winst" value={`€${stats.totalProfit.toFixed(2)}`} icon={<Euro className="text-indigo-600" />} color="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-800 uppercase tracking-tight">
            <Clock size={24} className="text-purple-600" /> Recente Orders
          </h2>
          <div className="space-y-4">
            {orders.length === 0 ? <p className="text-slate-400 italic text-center py-10">Nog geen bestellingen opgeslagen.</p> : orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-3xl border border-transparent transition-all">
                <div>
                  <p className="font-bold text-slate-900 text-lg leading-tight">{order.customer}</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                    {order.quantity}x {products.find(p => p.id === order.productId)?.name || 'Onbekend'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-purple-600 text-lg">€{(Number(order.price) * (order.quantity || 1)).toFixed(2)}</p>
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
            <Database size={24} className="text-purple-600" /> Filament Status
          </h2>
          <div className="space-y-8">
            {filaments.filter(f => f.status === 'actief').map(fil => {
              const rem = fil.totalWeight - (fil.usedWeight || 0);
              const perc = (rem / fil.totalWeight) * 100;
              return (
                <div key={fil.id} className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <div>
                      <div className="flex items-center gap-2">
                         <p className="font-black text-slate-800 text-base leading-none">{fil.brand}</p>
                         <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-black uppercase">{fil.materialType || 'PLA'}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-bold mt-1.5 uppercase tracking-wider">{fil.colorName}</p>
                    </div>
                    <p className={`text-sm font-black ${perc < 15 ? 'text-rose-500' : 'text-slate-600'}`}>{Math.round(rem)}g ({Math.round(perc)}%)</p>
                  </div>
                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200 p-1">
                    <div className={`h-full transition-all duration-1000 rounded-full ${perc < 15 ? 'bg-rose-500 animate-pulse' : 'bg-purple-600'}`} style={{ width: `${Math.max(0, perc)}%` }}></div>
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
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center gap-4 hover:shadow-xl hover:shadow-purple-50/50 transition-all duration-300">
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
  const [formData, setFormData] = useState({ 
    customer: '', 
    messengerLink: '', 
    productId: '', 
    price: '', 
    quantity: 1, 
    status: 'In de wacht', 
    comments: '',
    orderDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('orders', { ...formData, price: Number(formData.price), quantity: Number(formData.quantity) });
    setShowModal(false);
    setFormData({ customer: '', messengerLink: '', productId: '', price: '', quantity: 1, status: 'In de wacht', comments: '', orderDate: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-8">
      <button onClick={() => setShowModal(true)} className="bg-purple-600 text-white px-10 py-5 rounded-3xl flex items-center gap-4 font-black shadow-2xl shadow-purple-100 hover:scale-[1.03] transition-all border-none outline-none" style={{ backgroundColor: '#9333ea' }}>
        <Plus size={24} strokeWidth={4} /> BESTELLING TOEVOEGEN
      </button>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.25em]">
            <tr>
              <th className="px-10 py-8">Datum & Klant</th>
              <th className="px-10 py-8">Product</th>
              <th className="px-10 py-8">Financieel</th>
              <th className="px-10 py-8">Status</th>
              <th className="px-10 py-8 text-right">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-bold">
            {[...orders].sort((a,b) => new Date(b.orderDate || b.createdAt) - new Date(a.orderDate || a.createdAt)).reverse().map(order => {
              const p = products.find(p => p.id === order.productId);
              return (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                       <Calendar size={12}/>
                       <span className="text-[10px] uppercase font-black">{order.orderDate || 'Geen datum'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-slate-900 text-xl font-black">{order.customer}</p>
                      {order.messengerLink && (
                        <a href={order.messengerLink} target="_blank" rel="noreferrer" className="text-purple-500 hover:text-purple-700 bg-purple-50 p-1.5 rounded-lg">
                          <ExternalLink size={16} strokeWidth={2.5}/>
                        </a>
                      )}
                    </div>
                    {order.comments && <p className="text-[11px] text-slate-400 font-bold mt-1 italic">{order.comments}</p>}
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-slate-800 text-lg">{p?.name || 'Verwijderd'}</p>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{order.quantity} stuks</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-slate-900 text-xl font-black">€{(Number(order.price) * (order.quantity || 1)).toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-black">€{Number(order.price).toFixed(2)} p/s</p>
                  </td>
                  <td className="px-10 py-8">
                    <select 
                      value={order.status} 
                      onChange={(e) => onUpdate('orders', order.id, { status: e.target.value })} 
                      className={`border-2 rounded-2xl px-5 py-2.5 text-[10px] uppercase font-black cursor-pointer outline-none transition-all ${
                        order.status === 'Afgerond' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
                        order.status === 'Gereed' ? 'bg-purple-50 border-purple-100 text-purple-700' : 
                        'bg-white border-slate-100 focus:border-purple-300'
                      }`}
                    >
                      {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button onClick={() => onDelete('orders', order.id)} className="text-slate-200 hover:text-rose-500 p-3 bg-slate-50 rounded-2xl transition-all border-none"><Trash2 size={22} strokeWidth={2.5}/></button>
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
            <h2 className="text-3xl font-black mb-10 text-slate-900 uppercase">Bestelling Invoeren</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-3">Besteldatum</label>
                <input required type="date" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold text-lg" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <input required placeholder="Klantnaam" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold text-lg shadow-inner" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} />
                <select required className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold text-lg shadow-inner" value={formData.productId} onChange={e => {
                  const pId = e.target.value;
                  const p = products.find(prod => prod.id === pId);
                  setFormData({...formData, productId: pId, price: p?.suggestedPrice || ''});
                }}>
                  <option value="">Kies product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <input placeholder="Messenger Link" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold shadow-inner" value={formData.messengerLink} onChange={e => setFormData({...formData, messengerLink: e.target.value})} />
              <div className="grid grid-cols-2 gap-8">
                <input required type="number" min="1" placeholder="Aantal" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-black text-2xl shadow-inner" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                <input required type="number" step="0.01" placeholder="Prijs (€)" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-black text-2xl shadow-inner" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <textarea rows="3" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold text-slate-700 shadow-inner" placeholder="Opmerkingen..." value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} />
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase">Annuleren</button>
                <button type="submit" className="flex-1 py-6 bg-purple-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-purple-200 border-none" style={{ backgroundColor: '#9333ea' }}>OPSLAAN</button>
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
  const [formData, setFormData] = useState({ 
    name: '', 
    weight: '', 
    printTime: '', 
    filamentIds: [], 
    suggestedPrice: '' 
  });

  const calculateCosts = (p) => {
    let materialCost = 0;
    const linkedFilaments = filaments.filter(f => p.filamentIds?.includes(f.id));
    
    if (linkedFilaments.length > 0) {
      const weightPerFil = p.weight / linkedFilaments.length;
      linkedFilaments.forEach(f => {
        materialCost += (weightPerFil / f.totalWeight) * f.price;
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
    <div className="space-y-8">
      <button onClick={() => setShowModal(true)} className="bg-purple-600 text-white px-10 py-5 rounded-3xl flex items-center gap-4 font-black shadow-lg shadow-purple-100 hover:scale-[1.03] transition-all border-none outline-none" style={{ backgroundColor: '#9333ea' }}>
        <Plus size={24} strokeWidth={4} /> NIEUW PRODUCT
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {products.map(product => {
          const costs = calculateCosts(product);
          return (
            <div key={product.id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 group relative transition-all hover:shadow-xl hover:-translate-y-1">
              <h3 className="text-2xl font-black mb-2 text-slate-900">{product.name}</h3>
              <div className="flex gap-4 mb-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                <span>{product.weight}g</span>
                <span>{product.printTime}m</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-8">
                {product.filamentIds?.map(fid => {
                  const f = filaments.find(fil => fil.id === fid);
                  return f ? (
                    <div key={fid} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.colorCode }}></div>
                      <span className="text-[9px] font-black uppercase text-slate-500">{f.brand}</span>
                    </div>
                  ) : null;
                })}
              </div>

              <div className="grid grid-cols-2 gap-5 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Kostprijs</p>
                  <p className="text-xl font-black">€{costs.total.toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-purple-400 uppercase">Verkoop</p>
                  <p className="text-xl font-black text-purple-600">€{(product.suggestedPrice || 0).toFixed(2)}</p>
                </div>
              </div>
              <button onClick={() => onDelete('products', product.id)} className="absolute top-8 right-8 text-slate-100 hover:text-rose-500 p-2 border-none"><Trash2 size={22}/></button>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-3xl font-black mb-10 tracking-tight uppercase text-slate-900">Product Toevoegen</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input required placeholder="Naam" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold text-lg shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-6">
                <input required type="number" placeholder="Gewicht (g)" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold shadow-inner" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                <input required type="number" placeholder="Tijd (min)" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold shadow-inner" value={formData.printTime} onChange={e => setFormData({...formData, printTime: e.target.value})} />
              </div>
              
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-3">Selecteer Filamenten (Meerdere kleuren mogelijk)</label>
                <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-3xl shadow-inner">
                  {filaments.filter(f => f.status === 'actief').map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFilament(f.id)}
                      className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all text-left ${
                        formData.filamentIds.includes(f.id) 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-transparent bg-white'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: f.colorCode }}></div>
                      <div className="flex-1 truncate">
                        <p className="text-[10px] font-black uppercase leading-none">{f.brand}</p>
                        <p className="text-[9px] text-slate-400 font-bold truncate">{f.colorName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <input required type="number" step="0.01" placeholder="Verkoopprijs (€)" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-black text-2xl text-center shadow-inner" value={formData.suggestedPrice} onChange={e => setFormData({...formData, suggestedPrice: e.target.value})} />
              
              <div className="flex gap-6 pt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest">Annuleren</button>
                <button type="submit" className="flex-1 py-6 bg-purple-600 text-white rounded-[1.5rem] font-black text-xl shadow-2xl shadow-purple-100 border-none" style={{ backgroundColor: '#9333ea' }}>OPSLAAN</button>
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
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'copy'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    brand: '', 
    materialType: '', 
    colorName: '', 
    colorCode: '#9333ea', 
    totalWeight: 1000, 
    price: '', // Stukprijs
    totalPrice: '', // Totaalprijs (stuk * aantal)
    quantity: 1
  });
  const [showArchived, setShowArchived] = useState(false);

  // Prijs logica: update totaalprijs als stukprijs of aantal verandert
  const updatePricePerPiece = (total, qty) => {
    if (!qty || qty <= 0) return 0;
    return Number((total / qty).toFixed(2));
  };

  const updateTotalPrice = (piece, qty) => {
    return Number((piece * qty).toFixed(2));
  };

  const handlePriceChange = (field, value) => {
    const val = Number(value);
    if (field === 'price') {
      setFormData(prev => ({ 
        ...prev, 
        price: val, 
        totalPrice: updateTotalPrice(val, prev.quantity) 
      }));
    } else if (field === 'totalPrice') {
      setFormData(prev => ({ 
        ...prev, 
        totalPrice: val, 
        price: updatePricePerPiece(val, prev.quantity) 
      }));
    } else if (field === 'quantity') {
      const q = Number(value);
      setFormData(prev => ({ 
        ...prev, 
        quantity: q, 
        totalPrice: updateTotalPrice(prev.price, q) 
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modalMode === 'edit') {
      onUpdate('filaments', editingId, { 
        brand: formData.brand,
        materialType: formData.materialType,
        colorName: formData.colorName,
        colorCode: formData.colorCode,
        totalWeight: Number(formData.totalWeight),
        price: Number(formData.price)
      });
    } else {
      // 'add' of 'copy' modus
      onAdd('filaments', { 
        ...formData, 
        usedWeight: 0, 
        price: Number(formData.price), 
        totalWeight: Number(formData.totalWeight),
        status: 'actief' 
      });
    }
    closeModal();
  };

  const openModal = (mode, item = null) => {
    setModalMode(mode);
    if (item) {
      setEditingId(item.id);
      setFormData({
        brand: item.brand,
        materialType: item.materialType,
        colorName: item.colorName,
        colorCode: item.colorCode,
        totalWeight: item.totalWeight,
        price: item.price,
        totalPrice: item.price,
        quantity: 1
      });
    } else {
      setFormData({ 
        brand: '', materialType: '', colorName: '', colorCode: '#9333ea', 
        totalWeight: 1000, price: '', totalPrice: '', quantity: 1 
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const activeFilaments = filaments.filter(f => (showArchived ? f.status === 'leeg' : f.status === 'actief'));

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <button onClick={() => openModal('add')} className="bg-purple-600 text-white px-10 py-5 rounded-3xl flex items-center gap-4 font-black shadow-xl shadow-purple-100 hover:scale-[1.03] transition-all border-none outline-none" style={{ backgroundColor: '#9333ea' }}>
          <Plus size={24} strokeWidth={4} /> NIEUWE ROL
        </button>
        <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-100 rounded-[2rem] font-black text-[10px] uppercase text-slate-400 transition-all hover:border-purple-200 hover:text-purple-600 outline-none">
          {showArchived ? 'Terug naar Actieve Rollen' : 'Toon Lege Rollen'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {activeFilaments.map(fil => {
          const rem = fil.totalWeight - (fil.usedWeight || 0);
          const perc = (rem / fil.totalWeight) * 100;
          const isLow = perc < 15 && fil.status === 'actief';

          return (
            <div key={fil.id} className={`bg-white p-10 rounded-[3.5rem] border-2 transition-all relative group shadow-sm hover:shadow-xl ${isLow ? 'border-rose-200 shadow-rose-50' : 'border-slate-100'}`}>
              <div className="flex justify-between items-start mb-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     <h3 className="text-2xl font-black text-slate-900 leading-tight">{fil.brand}</h3>
                     <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg font-black uppercase">{fil.materialType || 'PLA'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-100 shadow-sm" style={{ backgroundColor: fil.colorCode }}></div>
                    {fil.colorName} • €{fil.price?.toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal('edit', fil)} className="text-slate-300 hover:text-purple-600 p-2 border-none" title="Bewerken"><Edit3 size={18}/></button>
                  <button onClick={() => openModal('copy', fil)} className="text-slate-300 hover:text-purple-600 p-2 border-none" title="Kopiëren als template"><Copy size={18}/></button>
                  <button onClick={() => onDelete('filaments', fil.id)} className="text-slate-300 hover:text-rose-500 p-2 border-none" title="Verwijderen"><Trash2 size={18}/></button>
                  {fil.status === 'actief' ? (
                    <button onClick={() => onUpdate('filaments', fil.id, { status: 'leeg' })} className="text-slate-300 hover:text-purple-500 p-2 border-none" title="Markeer als leeg"><Archive size={18}/></button>
                  ) : (
                    <button onClick={() => onUpdate('filaments', fil.id, { status: 'actief' })} className="text-slate-300 hover:text-emerald-500 p-2 border-none" title="Terugzetten naar actief"><RefreshCw size={18}/></button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4 mb-10">
                <div className="flex justify-between items-end px-1">
                   <p className={`text-[10px] font-black uppercase tracking-widest ${isLow ? 'text-rose-500' : 'text-slate-400'}`}>Resterend</p>
                   <p className="text-base font-black">{Math.round(rem)}g / {fil.totalWeight}g</p>
                </div>
                <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden border border-slate-200 p-1.5 shadow-inner">
                  <div className={`h-full transition-all duration-1000 rounded-full ${isLow ? 'bg-rose-500 animate-pulse' : 'bg-purple-600 shadow-lg shadow-purple-100'}`} style={{ width: `${Math.max(0, perc)}%` }}></div>
                </div>
              </div>

              {fil.status === 'actief' && (
                <div className="bg-slate-50 p-5 rounded-[2rem] flex items-center gap-4 border-2 border-transparent focus-within:border-purple-100 transition-all shadow-inner">
                   <Hash size={20} className="text-purple-500 shrink-0" />
                   <input type="number" placeholder="Verbruik (g) + Enter" className="w-full bg-transparent outline-none font-black text-slate-800 text-sm border-none shadow-none focus:ring-0" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value) { onUpdate('filaments', fil.id, { usedWeight: (fil.usedWeight || 0) + Number(e.target.value) }); e.target.value = ''; } }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-3xl font-black mb-10 tracking-tight uppercase text-slate-900">
              {modalMode === 'edit' ? 'Rol Aanpassen' : modalMode === 'copy' ? 'Template Kopiëren' : 'Nieuwe Rol Toevoegen'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-3">Merk</label>
                  <input required placeholder="Bijv. eSun" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold text-lg shadow-inner" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-3">Materiaal</label>
                  <input required placeholder="Bijv. PLA+, PETG" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold text-lg shadow-inner uppercase" value={formData.materialType} onChange={e => setFormData({...formData, materialType: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-3">Kleur Naam</label>
                  <input required placeholder="Bijv. Cold White" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold text-lg shadow-inner" value={formData.colorName} onChange={e => setFormData({...formData, colorName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-3">Totaal Gewicht (g)</label>
                  <input required type="number" placeholder="Bijv. 1000" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-bold text-lg shadow-inner" value={formData.totalWeight} onChange={e => setFormData({...formData, totalWeight: e.target.value})} />
                </div>
              </div>

              {modalMode !== 'edit' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-3">Aantal rollen (Bulk invoer)</label>
                  <input required type="number" min="1" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-black text-xl shadow-inner" value={formData.quantity} onChange={e => handlePriceChange('quantity', e.target.value)} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-3 tracking-widest">Prijs p/s (€)</label>
                  <input required type="number" step="0.01" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-black text-xl text-center shadow-inner" value={formData.price} onChange={e => handlePriceChange('price', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-3 tracking-widest">Totaal Prijs (€)</label>
                  <input required type="number" step="0.01" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-3xl outline-none font-black text-xl text-center shadow-inner" value={formData.totalPrice} onChange={e => handlePriceChange('totalPrice', e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-3 tracking-widest">Kleur Visualisatie</label>
                <input required type="color" className="w-full h-[68px] p-2 bg-slate-50 rounded-3xl cursor-pointer shadow-inner" value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} />
              </div>

              <div className="flex gap-6 pt-8">
                <button type="button" onClick={closeModal} className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest">Annuleren</button>
                <button type="submit" className="flex-1 py-6 bg-purple-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-purple-100 border-none" style={{ backgroundColor: '#9333ea' }}>
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
    <div className="max-w-xl bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-12">
      <div className="flex items-center gap-6 text-purple-600">
        <div className="bg-purple-50 p-5 rounded-[2rem] shadow-sm"><Zap size={40} strokeWidth={3} /></div>
        <h2 className="text-3xl font-black uppercase tracking-tight">Kosten Beheer</h2>
      </div>
      <div className="space-y-10">
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Energieprijs (€ per kWh)</label>
          <input type="number" step="0.01" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-black text-3xl text-center shadow-inner" value={temp.kwhPrice} onChange={e => setTemp({...temp, kwhPrice: Number(e.target.value)})} />
        </div>
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] ml-3">Printer Verbruik (W)</label>
          <input type="number" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-[2rem] outline-none font-black text-3xl text-center shadow-inner" value={temp.printerWattage} onChange={e => setTemp({...temp, printerWattage: Number(e.target.value)})} />
        </div>
        <button onClick={() => onSave(temp)} className="w-full py-8 bg-purple-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-none" style={{ backgroundColor: '#9333ea' }}>BIJWERKEN</button>
      </div>
    </div>
  );
}