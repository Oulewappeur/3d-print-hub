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
  WifiOff,
  Lock
} from 'lucide-react';

// Firebase Configuratie - Controleer of dit overeenkomt met je Firebase Console!
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

// DIT ID MOET OVEREENKOMEN MET JE DATABASE PAD
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
  const [errorType, setErrorType] = useState(null); // 'auth', 'permission', 'network'

  useEffect(() => {
    const initApp = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
        setErrorType('auth');
        setLoading(false);
      }
    };
    initApp();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Pad: /artifacts/{hubId}/public/data/{collection}
    const getPath = (name) => collection(db, 'artifacts', hubId, 'public', 'data', name);

    const unsubOrders = onSnapshot(query(getPath('orders')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setErrorType(null);
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      if (err.code === 'permission-denied') {
        setErrorType('permission');
      } else {
        setErrorType('network');
      }
      setLoading(false);
    });

    const unsubProducts = onSnapshot(query(getPath('products')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubFilaments = onSnapshot(query(getPath('filaments')), (snapshot) => {
      setFilaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, 'artifacts', hubId, 'public', 'data', 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) setSettings(docSnap.data());
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubFilaments();
      unsubSettings();
    };
  }, [user]);

  const addItem = async (coll, data) => {
    try {
      await addDoc(collection(db, 'artifacts', hubId, 'public', 'data', coll), {
        ...data,
        status: data.status || 'actief',
        createdAt: new Date().toISOString()
      });
    } catch (e) { console.error(e); }
  };

  const updateItem = async (coll, id, data) => {
    try {
      await updateDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id), data);
    } catch (e) { console.error(e); }
  };

  const deleteItem = async (coll, id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id));
    } catch (e) { console.error(e); }
  };

  const saveSettings = async (data) => {
    try {
      await setDoc(doc(db, 'artifacts', hubId, 'public', 'data', 'settings', 'global'), data);
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database synchroniseren...</p>
        </div>
      </div>
    );
  }

  if (errorType) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-xl border border-red-100 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto">
            {errorType === 'permission' ? <Lock size={40} /> : <WifiOff size={40} />}
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic">Toegang Geweigerd</h2>
            <p className="text-slate-500 font-medium">
              {errorType === 'permission' 
                ? "Je Firebase Security Rules blokkeren de toegang. Update je regels in de Firebase Console." 
                : "Er kan geen verbinding worden gemaakt met de database. Controleer je internet of Firebase config."}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl text-left border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Huidig Hub ID:</p>
            <code className="text-xs font-mono font-bold text-blue-600">{hubId}</code>
          </div>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-100">
            Opnieuw Proberen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-2 shadow-sm z-10">
        <div className="text-2xl font-black text-blue-600 mb-10 px-2 flex items-center gap-2">
          <Printer size={28} strokeWidth={3} /> 3D Hub
        </div>
        
        <div className="flex-1 space-y-1">
          {Object.values(TABS).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {tab === TABS.DASHBOARD && <LayoutDashboard size={20} />}
              {tab === TABS.ORDERS && <ShoppingCart size={20} />}
              {tab === TABS.CATALOG && <Package size={20} />}
              {tab === TABS.STOCK && <Database size={20} />}
              {tab === TABS.SETTINGS && <Settings size={20} />}
              {tab}
            </button>
          ))}
        </div>
        
        <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Systeem Status</p>
           <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Online: {hubId.slice(0,8)}...
           </div>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-12 overflow-auto bg-[#F8FAFC]">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">{activeTab}</h1>
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

// ... Rest van de componenten (Dashboard, OrderList, etc.) blijven hetzelfde zoals in de vorige versies
// Maar we zorgen dat ze de juiste data-props ontvangen

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
        const filCost = fil ? (prod.weight / (fil.totalWeight || 1000)) * fil.price : 0;
        const energyCost = (prod.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
        totalCost += (filCost + energyCost) * qty;
      }
    });

    return { 
      openOrders, readyOrders, totalRevenue, totalProfit: totalRevenue - totalCost, 
      activePrints: orders.filter(o => o.status === 'Printen').length 
    };
  }, [orders, products, filaments, settings]);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard title="Open Orders" value={stats.openOrders} icon={<Clock className="text-orange-500" />} />
        <StatCard title="Prints" value={stats.activePrints} icon={<Printer className="text-purple-500" />} />
        <StatCard title="Klaar" value={stats.readyOrders} icon={<CheckCircle2 className="text-green-600" />} />
        <StatCard title="Omzet" value={`€${stats.totalRevenue.toFixed(2)}`} icon={<TrendingUp className="text-blue-500" />} />
        <StatCard title="Winst" value={`€${stats.totalProfit.toFixed(2)}`} icon={<Euro className="text-emerald-500" />} />
      </div>
      
      {orders.length === 0 && (
        <div className="bg-white p-20 rounded-[4rem] text-center border-2 border-dashed border-slate-200">
           <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
              <Database size={40} />
           </div>
           <h3 className="text-xl font-black text-slate-400 uppercase italic">Geen data gevonden</h3>
           <p className="text-slate-400 font-bold max-w-xs mx-auto mt-2">Voeg een order toe of controleer je Firebase instellingen als je denkt dat er al data zou moeten zijn.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center gap-4 hover:shadow-lg transition-all">
      <div className="p-4 bg-slate-50 rounded-2xl">{icon}</div>
      <div>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  );
}

function OrderList({ orders, products, filaments, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    customer: '', messengerLink: '', productId: '', price: '', quantity: 1, 
    status: 'In de wacht', comments: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('orders', { ...formData, price: Number(formData.price), quantity: Number(formData.quantity) });
    setShowModal(false);
    setFormData({ customer: '', messengerLink: '', productId: '', price: '', quantity: 1, status: 'In de wacht', comments: '' });
  };

  return (
    <div className="space-y-8">
      <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] flex items-center gap-4 font-black shadow-xl shadow-blue-100 transition-all active:scale-95">
        <Plus size={24} strokeWidth={3} /> BESTELLING INVOEREN
      </button>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
            <tr><th className="px-10 py-8">Klant</th><th className="px-10 py-8">Product</th><th className="px-10 py-8 text-center">Totaal</th><th className="px-10 py-8 text-center">Status</th><th className="px-10 py-8 text-right">Beheer</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-bold">
            {orders.map(order => (
              <tr key={order.id}>
                <td className="px-10 py-8 font-black italic">{order.customer}</td>
                <td className="px-10 py-8 text-slate-500">{products.find(p => p.id === order.productId)?.name || '...'}</td>
                <td className="px-10 py-8 text-center font-black">€{(order.price * order.quantity).toFixed(2)}</td>
                <td className="px-10 py-8 text-center">
                  <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] uppercase font-black">{order.status}</span>
                </td>
                <td className="px-10 py-8 text-right">
                   <button onClick={() => onDelete('orders', order.id)} className="text-slate-200 hover:text-red-500"><Trash2 size={20}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-2xl">
            <h2 className="text-3xl font-black mb-8 italic uppercase">Nieuwe Order</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Klant..." className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} />
              <select required className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}>
                <option value="">Kies product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" placeholder="Aantal" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                <input required type="number" step="0.01" placeholder="Prijs p/s" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-black uppercase text-slate-400">Terug</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase">Opslaan</button>
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('products', { ...formData, weight: Number(formData.weight), printTime: Number(formData.printTime), suggestedPrice: Number(formData.suggestedPrice) });
    setShowModal(false);
    setFormData({ name: '', weight: '', printTime: '', defaultFilamentId: '', suggestedPrice: '' });
  };

  return (
    <div className="space-y-8">
      <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-lg shadow-blue-100">NIEUW PRODUCT</button>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(p => (
          <div key={p.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 relative group">
            <h3 className="text-2xl font-black italic mb-4">{p.name}</h3>
            <div className="flex gap-4 text-[10px] font-black uppercase text-slate-400">
               <span>{p.weight}g</span>
               <span>{p.printTime}m</span>
            </div>
            <button onClick={() => onDelete('products', p.id)} className="absolute top-8 right-8 text-slate-100 group-hover:text-red-500"><Trash2 size={20}/></button>
          </div>
        ))}
      </div>
      
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[3rem] p-12 w-full max-w-xl">
             <h2 className="text-3xl font-black mb-8 italic uppercase">Nieuw Product</h2>
             <form onSubmit={handleSubmit} className="space-y-4">
                <input required placeholder="Naam..." className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <input required type="number" placeholder="Gewicht (g)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                   <input required type="number" placeholder="Tijd (min)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={formData.printTime} onChange={e => setFormData({...formData, printTime: e.target.value})} />
                </div>
                <input required type="number" step="0.01" placeholder="Richtprijs (€)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-center text-2xl font-black" value={formData.suggestedPrice} onChange={e => setFormData({...formData, suggestedPrice: e.target.value})} />
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-black uppercase text-slate-400">Terug</button>
                   <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase">Toevoegen</button>
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('filaments', { ...formData, usedWeight: 0, price: Number(formData.price), status: 'actief' });
    setShowModal(false);
    setFormData({ brand: '', colorName: '', colorCode: '#3b82f6', totalWeight: 1000, price: '' });
  };

  return (
    <div className="space-y-8">
      <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-lg shadow-blue-100">NIEUWE ROL</button>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filaments.filter(f => f.status === 'actief').map(f => (
          <div key={f.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 relative group">
            <div className="w-10 h-10 rounded-2xl mb-4" style={{ backgroundColor: f.colorCode }}></div>
            <h3 className="text-xl font-black italic">{f.brand}</h3>
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{f.colorName}</p>
            <div className="mt-6 flex justify-between items-end">
               <p className="font-black text-blue-600 text-lg">{Math.round(f.totalWeight - (f.usedWeight || 0))}g</p>
               <p className="text-[10px] font-black text-slate-300">/ {f.totalWeight}g</p>
            </div>
            <button onClick={() => onDelete('filaments', f.id)} className="absolute top-8 right-8 text-slate-100 group-hover:text-red-500"><Trash2 size={20}/></button>
          </div>
        ))}
      </div>
      
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[3rem] p-12 w-full max-w-xl">
             <h2 className="text-3xl font-black mb-8 italic uppercase">Nieuwe Voorraad</h2>
             <form onSubmit={handleSubmit} className="space-y-4">
                <input required placeholder="Merk..." className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                <input required placeholder="Kleur..." className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={formData.colorName} onChange={e => setFormData({...formData, colorName: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <input required type="number" placeholder="Gewicht (g)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={formData.totalWeight} onChange={e => setFormData({...formData, totalWeight: e.target.value})} />
                   <input required type="color" className="w-full h-[68px] p-2 bg-slate-50 rounded-2xl" value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} />
                </div>
                <input required type="number" step="0.01" placeholder="Prijs per rol (€)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-center" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-black uppercase text-slate-400">Terug</button>
                   <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase">Toevoegen</button>
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
    <div className="max-w-xl bg-white p-12 rounded-[4rem] border border-slate-100 space-y-10">
      <h2 className="text-3xl font-black italic uppercase text-blue-600">Instellingen</h2>
      <div className="space-y-6">
        <div className="space-y-2">
           <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Stroomprijs p/kWh (€)</label>
           <input type="number" step="0.01" className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-black text-4xl text-center" value={temp.kwhPrice} onChange={e => setTemp({...temp, kwhPrice: Number(e.target.value)})} />
        </div>
        <div className="space-y-2">
           <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Verbruik Printer (W)</label>
           <input type="number" className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-black text-4xl text-center" value={temp.printerWattage} onChange={e => setTemp({...temp, printerWattage: Number(e.target.value)})} />
        </div>
        <button onClick={() => onSave(temp)} className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase tracking-widest shadow-xl shadow-blue-100">Opslaan</button>
      </div>
    </div>
  );
}