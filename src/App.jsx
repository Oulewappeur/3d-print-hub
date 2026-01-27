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
  ChevronRight,
  ChevronDown,
  Layers,
  Search
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
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const getPath = (name) => collection(db, 'artifacts', hubId, 'public', 'data', name);

    const unsubOrders = onSnapshot(query(getPath('orders')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setErrorMessage(null);
      setLoading(false);
    }, (err) => {
      if (err.code === 'permission-denied') setErrorMessage("Toegang geweigerd.");
      setLoading(false);
    });

    const unsubProducts = onSnapshot(query(getPath('products')), (snapshot) => setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubFilaments = onSnapshot(query(getPath('filaments')), (snapshot) => setFilaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubSettings = onSnapshot(doc(db, 'artifacts', hubId, 'public', 'data', 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) setSettings(docSnap.data());
    });

    return () => { unsubOrders(); unsubProducts(); unsubFilaments(); unsubSettings(); };
  }, [user]);

  const addItem = async (coll, data) => {
    if (!user) return;
    try {
      if (coll === 'filaments' && data.quantity > 1) {
        const { quantity, ...singleData } = data;
        for (let i = 0; i < quantity; i++) {
          await addDoc(collection(db, 'artifacts', hubId, 'public', 'data', coll), { ...singleData, status: 'actief', createdAt: new Date().toISOString() });
        }
      } else {
        await addDoc(collection(db, 'artifacts', hubId, 'public', 'data', coll), { ...data, status: data.status || 'actief', createdAt: new Date().toISOString() });
      }
    } catch (e) {}
  };

  const updateItem = async (coll, id, data) => { if (!user) return; try { await updateDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id), data); } catch (e) {} };
  const deleteItem = async (coll, id) => { if (!user) return; try { await deleteDoc(doc(db, 'artifacts', hubId, 'public', 'data', coll, id)); } catch (e) {} };
  const saveSettings = async (data) => { if (!user) return; try { await setDoc(doc(db, 'artifacts', hubId, 'public', 'data', 'settings', 'global'), data); } catch (e) {} };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFE] flex flex-col md:flex-row font-sans text-slate-900">
      <nav className="w-full md:w-72 bg-white border-r border-slate-100 p-6 flex flex-col gap-2 z-20 shadow-sm">
        <div className="text-xl font-black text-purple-600 mb-10 flex items-center gap-3 px-2">
          <div className="p-2 bg-purple-600 rounded-xl text-white">
            <Printer size={20} strokeWidth={3} />
          </div>
          3D Hub
        </div>
        
        <div className="flex flex-col gap-1.5 flex-1">
          {Object.values(TABS).map(tab => {
            const isActive = activeTab === tab;
            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 border-0 outline-none ring-0 focus:ring-0 focus:outline-none focus:border-0 ${
                  isActive 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-100 font-bold' 
                    : 'text-slate-500 hover:bg-purple-50 hover:text-purple-600'
                }`}
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
          <div className="mt-auto p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-bold flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </nav>

      <main className="flex-1 p-6 md:p-12 overflow-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{activeTab}</h1>
            <div className="h-1 w-16 bg-purple-600 mt-2 rounded-full"></div>
          </div>
        </header>

        {activeTab === TABS.DASHBOARD && <Dashboard orders={orders} products={products} filaments={filaments} settings={settings} />}
        {activeTab === TABS.ORDERS && <OrderList orders={orders} products={products} filaments={filaments} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />}
        {activeTab === TABS.CATALOG && <ProductList products={products} filaments={filaments} settings={settings} onAdd={addItem} onDelete={deleteItem} />}
        {activeTab === TABS.STOCK && <StockTable filaments={filaments} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />}
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
          linkedFilaments.forEach(f => { materialCostForOne += (weightPerFilament / (f.totalWeight || 1000)) * f.price; });
        }
        const energyCost = (prod.printTime / 60) * (settings.printerWattage / 1000) * settings.kwhPrice;
        totalCost += (materialCostForOne + energyCost) * qty;
      }
    });

    const criticalFilaments = filaments.filter(f => f.status === 'actief' && ((f.totalWeight - (f.usedWeight || 0)) / (f.totalWeight || 1)) < 0.15);
    return { openOrders, readyOrders, totalRevenue, totalProfit: totalRevenue - totalCost, activePrints: orders.filter(o => o.status === 'Printen').length, criticalFilaments };
  }, [orders, products, filaments, settings]);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Open" value={stats.openOrders} icon={<Clock size={20} />} color="text-orange-600" bg="bg-orange-50" />
        <StatCard title="Printen" value={stats.activePrints} icon={<Printer size={20} />} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title="Gereed" value={stats.readyOrders} icon={<CheckCircle2 size={20} />} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Omzet" value={`€${stats.totalRevenue.toFixed(2)}`} icon={<Euro size={20} />} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title="Winst" value={`€${stats.totalProfit.toFixed(2)}`} icon={<TrendingUp size={20} />} color="text-indigo-600" bg="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-black mb-6 flex items-center gap-2 uppercase italic tracking-tight"><Clock size={18} className="text-purple-600"/> Recente Orders</h2>
          <div className="space-y-4">
            {orders.slice(0, 5).map(o => (
              <div key={o.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-900">{o.customer}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{o.quantity}x {products.find(p => p.id === o.productId)?.name || 'Product'}</p>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${o.status === 'Gereed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{o.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-black mb-6 flex items-center gap-2 uppercase italic tracking-tight"><Database size={18} className="text-purple-600"/> Laag in Voorraad</h2>
          <div className="space-y-6">
            {stats.criticalFilaments.length === 0 ? <p className="text-xs text-slate-400 italic">Alle voorraad is voldoende.</p> : stats.criticalFilaments.slice(0, 4).map(f => {
              const perc = ((f.totalWeight - (f.usedWeight || 0)) / f.totalWeight) * 100;
              return (
                <div key={f.id} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span>{f.brand} {f.colorName}</span>
                    <span className="text-rose-600">{Math.round(perc)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${perc}%` }}></div>
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

function StatCard({ title, value, icon, color, bg }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
      <div className={`p-3 ${bg} ${color} rounded-2xl`}>{icon}</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-xl font-black text-slate-900 tracking-tighter italic">{value}</p>
    </div>
  );
}

function OrderList({ orders, products, filaments, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ customer: '', messengerLink: '', productId: '', price: '', quantity: 1, status: 'In de wacht', comments: '', orderDate: new Date().toISOString().split('T')[0] });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('orders', { ...formData, price: Number(formData.price), quantity: Number(formData.quantity) });
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <button onClick={() => setShowModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-lg shadow-purple-100 border-0 outline-none transition-all uppercase text-sm italic">
        <Plus size={20} strokeWidth={3} /> Bestelling Invoeren
      </button>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Klant & Datum</th>
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Beheer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.sort((a,b) => new Date(b.orderDate) - new Date(a.orderDate)).map(order => (
              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900">{order.customer}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{order.orderDate}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-700 text-sm">{products.find(p => p.id === order.productId)?.name || 'Onbekend'}</p>
                  <p className="text-[10px] text-slate-400 font-bold">€{(order.price * order.quantity).toFixed(2)} ({order.quantity}x)</p>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={order.status} 
                    onChange={(e) => onUpdate('orders', order.id, { status: e.target.value })} 
                    className="bg-transparent border-0 text-[10px] font-black uppercase text-purple-600 outline-none cursor-pointer"
                  >
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => onDelete('orders', order.id)} className="text-slate-300 hover:text-rose-500 border-0 bg-transparent outline-none"><Trash2 size={18} /></button>
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
              <Input label="Klant" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} required />
              <Input label="Datum" type="date" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Product</label>
              <select required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold appearance-none" value={formData.productId} onChange={e => {
                const p = products.find(prod => prod.id === e.target.value);
                setFormData({...formData, productId: e.target.value, price: p?.suggestedPrice || ''});
              }}>
                <option value="">Kies product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Aantal" type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
              <Input label="Prijs (€)" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
            </div>
            <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black italic uppercase shadow-lg shadow-purple-100 border-0 outline-none">Opslaan</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StockTable({ filaments, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({ brand: '', materialType: '', colorName: '', colorCode: '#9333ea', totalWeight: 1000, price: '', purchaseDate: new Date().toISOString().split('T')[0], shopName: '', quantity: 1 });

  const grouped = useMemo(() => {
    const groups = {};
    filaments.filter(f => (showArchived ? f.status === 'leeg' : f.status === 'actief')).forEach(f => {
      const key = `${f.brand}-${f.materialType}-${f.colorName}`;
      if (!groups[key]) groups[key] = { ...f, rolls: [] };
      groups[key].rolls.push(f);
    });
    return Object.values(groups);
  }, [filaments, showArchived]);

  const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd('filaments', { ...formData, usedWeight: 0, price: Number(formData.price) });
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button onClick={() => setShowModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-lg shadow-purple-100 border-0 outline-none transition-all uppercase text-sm italic">
          <Plus size={20} strokeWidth={3} /> Rol Toevoegen
        </button>
        <button onClick={() => setShowArchived(!showArchived)} className="text-[10px] font-black uppercase text-slate-400 border-0 bg-transparent outline-none flex items-center gap-2 hover:text-purple-600 transition-colors">
          <Archive size={14} /> {showArchived ? 'Toon Actieve Voorraad' : 'Toon Archief (Lege Rollen)'}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 w-12">Kleur</th>
              <th className="px-6 py-4">Omschrijving</th>
              <th className="px-6 py-4">Rollen</th>
              <th className="px-6 py-4">Totaal (g)</th>
              <th className="px-6 py-4 text-right">Verbruik</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {grouped.map(group => {
              const key = `${group.brand}-${group.colorName}`;
              const isExpanded = expandedGroups[key];
              const totalRemaining = group.rolls.reduce((acc, r) => acc + (r.totalWeight - (r.usedWeight || 0)), 0);

              return (
                <React.Fragment key={key}>
                  <tr onClick={() => toggleGroup(key)} className="cursor-pointer hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="w-6 h-6 rounded-lg border border-slate-200" style={{ backgroundColor: group.colorCode }}></div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900">{group.brand} {group.materialType}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{group.colorName}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Layers size={14} className="text-purple-400" /> {group.rolls.length}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-black text-slate-700 text-sm tracking-tighter italic">{Math.round(totalRemaining)}g</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {isExpanded ? <ChevronDown size={18} className="text-slate-300 ml-auto" /> : <ChevronRight size={18} className="text-slate-300 ml-auto" />}
                    </td>
                  </tr>
                  {isExpanded && group.rolls.map(roll => {
                    const rem = roll.totalWeight - (roll.usedWeight || 0);
                    return (
                      <tr key={roll.id} className="bg-slate-50/30 border-l-4 border-purple-500">
                        <td className="px-6 py-3 text-center">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mx-auto"></div>
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-[10px] font-black text-slate-500 uppercase">Rol #{roll.id.slice(-4)} • {roll.purchaseDate}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{roll.shopName || 'Geen shop'}</p>
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-[10px] font-bold text-slate-500">€{roll.price.toFixed(2)}</p>
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-xs font-bold text-slate-600 italic">{Math.round(rem)}g / {roll.totalWeight}g</p>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="flex bg-white rounded-lg border border-slate-200 p-1 px-2 items-center gap-2 shadow-sm">
                               <Hash size={12} className="text-purple-400" />
                               <input 
                                 type="number" 
                                 placeholder="Grams..." 
                                 className="w-12 text-[10px] font-bold outline-none border-0" 
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter' && e.target.value) {
                                     onUpdate('filaments', roll.id, { usedWeight: (roll.usedWeight || 0) + Number(e.target.value) });
                                     e.target.value = '';
                                   }
                                 }}
                               />
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onDelete('filaments', roll.id); }} className="text-slate-300 hover:text-rose-500 border-0 bg-transparent outline-none"><Trash2 size={14}/></button>
                            <button onClick={(e) => { e.stopPropagation(); onUpdate('filaments', roll.id, { status: showArchived ? 'actief' : 'leeg' }); }} className="text-slate-300 hover:text-purple-500 border-0 bg-transparent outline-none">
                              {showArchived ? <RefreshCw size={14}/> : <Archive size={14}/>}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Nieuwe Filament Rol" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Merk" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} required />
              <Input label="Materiaal" value={formData.materialType} onChange={e => setFormData({...formData, materialType: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Kleur Naam" value={formData.colorName} onChange={e => setFormData({...formData, colorName: e.target.value})} required />
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Kleur Selectie</label>
                <input type="color" className="w-full h-12 p-1 bg-slate-50 rounded-2xl outline-none cursor-pointer" value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Prijs (€)" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
              <Input label="Gram Totaal" type="number" value={formData.totalWeight} onChange={e => setFormData({...formData, totalWeight: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Aankoopdatum" type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} required />
              <Input label="Winkel" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} />
            </div>
            <Input label="Aantal rollen (Bulk)" type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
            <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black italic uppercase shadow-lg shadow-purple-100 border-0 outline-none">Opslaan</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ProductList({ products, filaments, settings, onAdd, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', weight: '', printTime: '', filamentIds: [], suggestedPrice: '' });

  const groupedFilaments = useMemo(() => {
    const groups = {};
    filaments.filter(f => f.status === 'actief').forEach(f => {
      const key = `${f.brand}-${f.materialType}-${f.colorName}`;
      if (!groups[key]) groups[key] = { ...f, rolls: [] };
      groups[key].rolls.push(f);
    });
    return Object.values(groups);
  }, [filaments]);

  const toggleFilament = (id) => setFormData(prev => ({ ...prev, filamentIds: prev.filamentIds.includes(id) ? prev.filamentIds.filter(fid => fid !== id) : [...prev.filamentIds, id] }));

  return (
    <div className="space-y-10">
      <button onClick={() => setShowModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-lg shadow-purple-100 border-0 outline-none transition-all uppercase text-sm italic">
        <Plus size={20} strokeWidth={3} /> Nieuw Product
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map(p => (
          <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group hover:shadow-xl transition-all">
            <h3 className="text-xl font-black mb-1 italic tracking-tight">{p.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{p.weight}g • {p.printTime}m</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {p.filamentIds?.map(fid => {
                const f = filaments.find(fil => fil.id === fid);
                return f ? <div key={fid} className="w-5 h-5 rounded-full border border-slate-200" style={{ backgroundColor: f.colorCode }}></div> : null;
              })}
            </div>
            <div className="flex items-end justify-between">
               <div className="bg-purple-50 px-5 py-3 rounded-2xl">
                 <p className="text-[9px] font-black text-purple-400 uppercase leading-none mb-1">Verkoop</p>
                 <p className="text-xl font-black text-purple-600 tracking-tighter italic">€{(p.suggestedPrice || 0).toFixed(2)}</p>
               </div>
               <button onClick={() => onDelete('products', p.id)} className="text-slate-200 hover:text-rose-500 transition-colors border-0 bg-transparent outline-none"><Trash2 size={20}/></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title="Nieuw Catalogus Item" onClose={() => setShowModal(false)}>
          <form onSubmit={(e) => { e.preventDefault(); onAdd('products', { ...formData, weight: Number(formData.weight), printTime: Number(formData.printTime), suggestedPrice: Number(formData.suggestedPrice) }); setShowModal(false); }} className="space-y-6">
            <Input label="Naam Product" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Gewicht (g)" type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} required />
              <Input label="Print Tijd (min)" type="number" value={formData.printTime} onChange={e => setFormData({...formData, printTime: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Gekoppelde Filamenten</label>
              <div className="max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl grid grid-cols-2 gap-3 shadow-inner">
                {groupedFilaments.map(group => group.rolls.map(roll => (
                  <button key={roll.id} type="button" onClick={() => toggleFilament(roll.id)} className={`p-3 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 border-0 outline-none transition-all ${formData.filamentIds.includes(roll.id) ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-500 shadow-sm'}`}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: roll.colorCode }}></div>
                    #{roll.id.slice(-4)}
                  </button>
                )))}
              </div>
            </div>
            <Input label="Adviesprijs (€)" type="number" step="0.01" value={formData.suggestedPrice} onChange={e => setFormData({...formData, suggestedPrice: e.target.value})} required />
            <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black italic uppercase border-0 outline-none">Product Toevoegen</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SettingsPanel({ settings, onSave }) {
  const [temp, setTemp] = useState(settings);
  return (
    <div className="max-w-md bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
      <h2 className="text-xl font-black flex items-center gap-3 italic uppercase tracking-tight text-purple-600"><Zap size={24} /> Energie & Tarieven</h2>
      <div className="space-y-6">
        <Input label="Prijs per kWh (€)" type="number" step="0.01" value={temp.kwhPrice} onChange={e => setTemp({...temp, kwhPrice: Number(e.target.value)})} />
        <Input label="Printer Verbruik (W)" type="number" value={temp.printerWattage} onChange={e => setTemp({...temp, printerWattage: Number(e.target.value)})} />
        <button onClick={() => onSave(temp)} className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black italic uppercase shadow-lg shadow-purple-100 border-0 outline-none">Instellingen Opslaan</button>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1 flex-1">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">{label}</label>
      <input {...props} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 border-0 focus:bg-slate-100 transition-colors shadow-inner" />
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] border border-white">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors border-0 bg-transparent outline-none">Sluiten</button>
        </div>
        {children}
      </div>
    </div>
  );
}