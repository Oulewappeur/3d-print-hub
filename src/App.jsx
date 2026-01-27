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
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
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
  Lock,
  LogOut,
  User
} from 'lucide-react';

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'd-printer-orders-1b6f3';

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
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const publicPath = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);

    const unsubOrders = onSnapshot(query(publicPath('orders')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      if (err.code === 'permission-denied') setAuthError("Geen toegang tot data.");
    });

    const unsubProducts = onSnapshot(query(publicPath('products')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubFilaments = onSnapshot(query(publicPath('filaments')), (snapshot) => {
      setFilaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) setSettings(docSnap.data());
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubFilaments();
      unsubSettings();
    };
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err) {
      setAuthError("Inloggen mislukt. Controleer je gegevens.");
    }
  };

  const addItem = async (coll, data) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', coll), {
      ...data,
      status: data.status || 'actief',
      createdAt: new Date().toISOString()
    });
  };

  const updateItem = async (coll, id, data) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', coll, id), data);
  };

  const deleteItem = async (coll, id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', coll, id));
  };

  const saveSettings = async (data) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), data);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 mb-4">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">3D Hub Login</h1>
            <p className="text-slate-400 text-sm font-medium mt-1">Beveiligde toegang voor Anton</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">E-mailadres</label>
              <input 
                required 
                type="email" 
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold transition-all" 
                value={loginEmail} 
                onChange={e => setLoginEmail(e.target.value)} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Wachtwoord</label>
              <input 
                required 
                type="password" 
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold transition-all" 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)} 
              />
            </div>
            {authError && <p className="text-xs font-bold text-red-500 text-center">{authError}</p>}
            <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-100 active:scale-95 transition-all">
              INLOGGEN
            </button>
          </form>
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

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Eigenaar</p>
              <p className="text-[11px] font-bold text-slate-700 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="w-full flex items-center justify-center gap-2 p-3 text-slate-400 hover:text-red-500 font-black text-[10px] uppercase transition-colors">
            <LogOut size={14} /> Afmelden
          </button>
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

    return { 
      openOrders, readyOrders, totalRevenue, totalProfit: totalRevenue - totalCost, 
      activePrints: orders.filter(o => o.status === 'Printen').length, criticalFilaments 
    };
  }, [orders, products, filaments, settings]);

  return (
    <div className="space-y-10">
      {stats.criticalFilaments.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 p-8 rounded-[2.5rem] flex items-center gap-8 shadow-lg shadow-red-100">
          <div className="bg-red-500 p-4 rounded-2xl text-white">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h2 className="text-xl font-black text-red-900 uppercase tracking-tight">Kritieke Voorraad!</h2>
            <p className="text-red-700 font-bold">Lage voorraad: {stats.criticalFilaments.map(f => `${f.brand} ${f.colorName}`).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard title="Open Orders" value={stats.openOrders} icon={<Clock className="text-orange-500" />} />
        <StatCard title="Prints" value={stats.activePrints} icon={<Printer className="text-purple-500" />} />
        <StatCard title="Klaar" value={stats.readyOrders} icon={<CheckCircle2 className="text-green-600" />} />
        <StatCard title="Omzet" value={`€${stats.totalRevenue.toFixed(2)}`} icon={<TrendingUp className="text-blue-500" />} />
        <StatCard title="Winst" value={`€${stats.totalProfit.toFixed(2)}`} icon={<Euro className="text-emerald-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <h2 className="text-xl font-black mb-8 flex items-center gap-3 uppercase"><Clock size={20} className="text-blue-600" /> Recente Orders</h2>
          <div className="space-y-4">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-900">{order.customer}</p>
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{order.quantity}x {products.find(p => p.id === order.productId)?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-blue-600">€{(Number(order.price) * (order.quantity || 1)).toFixed(2)}</p>
                  <p className="text-[10px] font-black uppercase text-slate-300">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <h2 className="text-xl font-black mb-8 flex items-center gap-3 uppercase"><Database size={20} className="text-blue-600" /> Filament Status</h2>
          <div className="space-y-8">
            {filaments.filter(f => f.status === 'actief').map(fil => {
              const rem = fil.totalWeight - (fil.usedWeight || 0);
              const perc = (rem / fil.totalWeight) * 100;
              return (
                <div key={fil.id} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="font-black text-slate-800 text-sm leading-none">{fil.brand}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase mt-1">{fil.colorName}</p>
                    </div>
                    <p className={`text-sm font-black ${perc < 15 ? 'text-red-500' : 'text-slate-500'}`}>{Math.round(rem)}g</p>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-100">
                    <div className={`h-full transition-all duration-1000 ${perc < 15 ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`} style={{ width: `${Math.max(0, perc)}%` }}></div>
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

  useEffect(() => {
    if (formData.productId) {
      const p = products.find(p => p.id === formData.productId);
      if (p) setFormData(prev => ({ ...prev, price: p.suggestedPrice || '' }));
    }
  }, [formData.productId, products]);

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
            <tr>
              <th className="px-10 py-8">Klant</th>
              <th className="px-10 py-8">Product</th>
              <th className="px-10 py-8">Totaal</th>
              <th className="px-10 py-8">Status</th>
              <th className="px-10 py-8 text-right">Beheer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-bold">
            {[...orders].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => {
              const p = products.find(p => p.id === order.productId);
              return (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-900 text-xl font-black italic tracking-tight">{order.customer}</p>
                      {order.messengerLink && (
                        <a href={order.messengerLink} target="_blank" rel="noreferrer" className="text-blue-500">
                          <ExternalLink size={16}/>
                        </a>
                      )}
                    </div>
                    {order.comments && <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 italic tracking-widest leading-relaxed">{order.comments}</p>}
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-slate-800">{p?.name || 'Onbekend'}</p>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{order.quantity}x</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-slate-900 text-xl font-black">€{(Number(order.price) * (order.quantity || 1)).toFixed(2)}</p>
                  </td>
                  <td className="px-10 py-8">
                    <select 
                      value={order.status} 
                      onChange={(e) => onUpdate('orders', order.id, { status: e.target.value })} 
                      className="border-2 rounded-full px-5 py-2.5 text-[10px] uppercase font-black cursor-pointer bg-white border-slate-100 focus:border-blue-300 outline-none transition-all"
                    >
                      {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button onClick={() => onDelete('orders', order.id)} className="text-slate-200 hover:text-red-500 p-2"><Trash2 size={24}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-4xl font-black mb-10 text-slate-900 uppercase italic tracking-tighter">Nieuwe Order</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Klant</label>
                  <input required placeholder="Naam..." className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-lg" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Product</label>
                  <select required className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-lg appearance-none" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}>
                    <option value="">Selecteer...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Messenger Chat Link</label>
                <input placeholder="https://..." className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold" value={formData.messengerLink} onChange={e => setFormData({...formData, messengerLink: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-8 text-center">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Aantal</label>
                  <input required type="number" min="1" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-black text-3xl text-center" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Prijs p/s (€)</label>
                  <input required type="number" step="0.01" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-black text-3xl text-center" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Extra Opmerkingen</label>
                <textarea rows="3" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-medium" placeholder="Bijv. kleurwissel halverwege..." value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} />
              </div>
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest">Annuleren</button>
                <button type="submit" className="flex-1 py-6 bg-blue-600 text-white rounded-[2rem] font-black text-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 italic">OPSLAAN</button>
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
    <div className="space-y-12">
      <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] flex items-center gap-4 font-black shadow-lg shadow-blue-100">
        <Plus size={24} strokeWidth={3} /> NIEUW PRODUCT
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {products.map(product => {
          const costs = calculateCosts(product);
          return (
            <div key={product.id} className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 group relative transition-all hover:shadow-2xl">
              <h3 className="text-3xl font-black mb-4 text-slate-900 tracking-tight italic">{product.name}</h3>
              <div className="flex gap-6 mb-10 text-[10px] font-black uppercase text-slate-400 tracking-[0.25em]">
                <span className="flex items-center gap-2"><Package size={16}/> {product.weight}g</span>
                <span className="flex items-center gap-2"><Clock size={16}/> {product.printTime} min</span>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-50 p-6 rounded-[2.5rem] text-center shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kost</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">€{costs.total.toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-[2.5rem] text-center shadow-inner">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Verkoop</p>
                  <p className="text-2xl font-black text-blue-600 tracking-tighter">€{(product.suggestedPrice || 0).toFixed(2)}</p>
                </div>
              </div>

              <button onClick={() => onDelete('products', product.id)} className="absolute top-10 right-10 text-slate-100 hover:text-red-500 transition-colors p-2"><Trash2 size={24}/></button>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-4xl font-black mb-10 text-slate-900 uppercase italic tracking-tighter">Item Toevoegen</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input required placeholder="Naam Item..." className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-8 text-center">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Gewicht (g)</label>
                  <input required type="number" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2.5rem] outline-none font-black text-3xl text-center shadow-inner" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Tijd (min)</label>
                  <input required type="number" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2.5rem] outline-none font-black text-3xl text-center shadow-inner" value={formData.printTime} onChange={e => setFormData({...formData, printTime: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Type Filament</label>
                <select className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2.5rem] outline-none font-bold text-lg appearance-none shadow-inner" value={formData.defaultFilamentId} onChange={e => setFormData({...formData, defaultFilamentId: e.target.value})}>
                  <option value="">Kies...</option>
                  {filaments.filter(f => f.status === 'actief').map(f => <option key={f.id} value={f.id}>{f.brand} {f.colorName}</option>)}
                </select>
              </div>
              <div className="space-y-1 text-center">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Aanbevolen Verkoopprijs (€)</label>
                <input required type="number" step="0.01" className="w-full p-8 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[3rem] outline-none font-black text-5xl text-center shadow-inner tracking-tighter" value={formData.suggestedPrice} onChange={e => setFormData({...formData, suggestedPrice: e.target.value})} />
              </div>
              <div className="flex gap-8 pt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-6 text-slate-400 font-black uppercase tracking-widest">Annuleren</button>
                <button type="submit" className="flex-1 py-8 bg-blue-600 text-white rounded-[3rem] font-black text-2xl shadow-2xl shadow-blue-100 italic transition-all active:scale-95 border-none">OPSLAAN</button>
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
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-12 py-6 rounded-[2.5rem] flex items-center gap-5 font-black shadow-2xl shadow-blue-100 active:scale-95 transition-all italic">
          <Plus size={28} strokeWidth={4} /> NIEUWE ROL
        </button>
        <button 
          onClick={() => setShowArchived(!showArchived)} 
          className="flex items-center gap-4 px-10 py-5 bg-white border-2 border-slate-100 rounded-[2.5rem] font-black text-xs uppercase tracking-widest text-slate-400 hover:border-blue-200 transition-all shadow-sm"
        >
          {showArchived ? 'Actieve Rollen' : 'Lege Rollen'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {activeFilaments.map(fil => {
          const rem = fil.totalWeight - (fil.usedWeight || 0);
          const perc = (rem / fil.totalWeight) * 100;
          const isLow = perc < 15 && fil.status === 'actief';

          return (
            <div key={fil.id} className={`bg-white p-12 rounded-[4rem] border-2 transition-all relative group shadow-sm hover:shadow-2xl ${isLow ? 'border-red-200 shadow-red-50' : 'border-slate-50'}`}>
              <div className="flex justify-between items-start mb-10">
                <div className="min-w-0 flex-1 pr-4">
                  <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter truncate">{fil.brand}</h3>
                  <div className="flex items-center gap-3 text-xs font-black uppercase text-slate-400 tracking-widest mt-2">
                    <div className="w-5 h-5 rounded-full border border-slate-100 shadow-sm" style={{ backgroundColor: fil.colorCode }}></div>
                    {fil.colorName} • €{fil.price?.toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onDelete('filaments', fil.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2"><Trash2 size={24}/></button>
                  {fil.status === 'actief' && (
                    <button onClick={() => onUpdate('filaments', fil.id, { status: 'leeg' })} className="text-slate-200 hover:text-blue-500 transition-colors p-2" title="Markeer leeg"><Archive size={24}/></button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4 mb-10">
                <div className="flex justify-between items-end px-2">
                   <p className={`text-[11px] font-black uppercase tracking-widest ${isLow ? 'text-red-500' : 'text-slate-400'}`}>Resterend</p>
                   <p className="text-lg font-black tracking-tighter italic">{Math.round(rem)}g / {fil.totalWeight}g</p>
                </div>
                <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden border border-slate-200 p-1.5 shadow-inner">
                  <div className={`h-full transition-all duration-1000 rounded-full ${isLow ? 'bg-red-500 animate-pulse shadow-lg shadow-red-200' : 'bg-blue-600 shadow-lg shadow-blue-200'}`} style={{ width: `${Math.max(0, perc)}%` }}></div>
                </div>
              </div>

              {fil.status === 'actief' && (
                <div className="bg-slate-50 p-6 rounded-[2.5rem] flex items-center gap-5 border-2 border-transparent focus-within:border-blue-200 transition-all shadow-inner group-focus-within:shadow-none">
                   <Hash size={24} className="text-blue-500 shrink-0" />
                   <input 
                      type="number" 
                      placeholder="Verbruik (g)..."
                      className="w-full bg-transparent outline-none font-black text-slate-800 text-base"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value) {
                          onUpdate('filaments', fil.id, { usedWeight: (fil.usedWeight || 0) + Number(e.target.value) });
                          e.target.value = '';
                        }
                      }}
                    />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-4xl font-black mb-10 text-slate-900 uppercase italic tracking-tighter">Voorraad Invoer</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
              <input required placeholder="Merk (bijv. Prusament)..." className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
              <input required placeholder="Kleur Naam..." className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] outline-none font-bold text-xl shadow-inner uppercase" value={formData.colorName} onChange={e => setFormData({...formData, colorName: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-8 text-center">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Prijs (€)</label>
                  <input required type="number" step="0.01" className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[2.5rem] outline-none font-black text-3xl text-center shadow-inner" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Visuele Kleur</label>
                  <input required type="color" className="w-full h-[76px] p-2 bg-slate-50 rounded-[2.5rem] cursor-pointer shadow-inner" value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} />
                </div>
              </div>
              
              <div className="flex gap-8 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-6 text-slate-400 font-black uppercase tracking-widest">Annuleren</button>
                <button type="submit" className="flex-1 py-8 bg-blue-600 text-white rounded-[3rem] font-black text-2xl shadow-2xl shadow-blue-100 italic transition-all active:scale-95 border-none">OPSLAAN</button>
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
      <div className="flex items-center gap-8 text-blue-600">
        <div className="bg-blue-50 p-6 rounded-[2.5rem] shadow-sm shadow-blue-100 italic"><Zap size={44} strokeWidth={3} /></div>
        <h2 className="text-4xl font-black uppercase tracking-tight italic">Energie</h2>
      </div>
      
      <div className="space-y-14">
        <div className="space-y-4 text-center">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Prijs per kWh (€)</label>
          <input type="number" step="0.01" className="w-full p-10 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[3rem] outline-none font-black text-6xl text-center shadow-inner tracking-tighter" value={temp.kwhPrice} onChange={e => setTemp({...temp, kwhPrice: Number(e.target.value)})} />
        </div>
        
        <div className="space-y-4 text-center">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Printer Verbruik (W)</label>
          <input type="number" className="w-full p-10 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[3rem] outline-none font-black text-6xl text-center shadow-inner tracking-tighter" value={temp.printerWattage} onChange={e => setTemp({...temp, printerWattage: Number(e.target.value)})} />
        </div>

        <button onClick={() => onSave(temp)} className="w-full py-10 bg-blue-600 text-white rounded-[3.5rem] font-black text-3xl shadow-2xl shadow-blue-100 active:scale-95 transition-all italic border-none">
          INSTELLINGEN BIJWERKEN
        </button>
      </div>
    </div>
  );
}