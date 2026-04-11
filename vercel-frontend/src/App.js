import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Plus, Search, X, Home, MapPin, Mail, Phone, BarChart3, Share2, MessageCircle, Send, Loader2, Eye } from "lucide-react";
import { Toaster, toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import "./App.css";

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "https://berlin-rent-backend.onrender.com/api";
const BERLIN_CENTER = [52.52, 13.405];
const BERLIN_ZOOM = 12;

// Marker Icons
const createOfferingIcon = () => L.divIcon({
  className: "custom-icon",
  html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#10B981,#059669);border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2px solid white;display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:12px;">🏠</span></div>`,
  iconSize: [28, 28], iconAnchor: [14, 28],
});

const createLookingIcon = () => L.divIcon({
  className: "custom-icon",
  html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#8B5CF6,#7C3AED);border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2px solid white;display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:12px;">👀</span></div>`,
  iconSize: [28, 28], iconAnchor: [14, 28],
});

const createPinIcon = () => L.divIcon({
  className: "custom-icon",
  html: `<div style="width:36px;height:36px;background:linear-gradient(135deg,#F97316,#EA580C);border-radius:50%;box-shadow:0 4px 15px rgba(249,115,22,0.5);border:3px solid white;display:flex;align-items:center;justify-content:center;"><span style="font-size:16px;">📍</span></div>`,
  iconSize: [36, 36], iconAnchor: [18, 18],
});

// Map Components
const MapClickHandler = ({ onMapClick, isPlacingPin }) => {
  useMapEvents({ click: (e) => isPlacingPin && onMapClick(e.latlng) });
  return null;
};

const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, zoom || map.getZoom(), { animate: true }); }, [center, zoom, map]);
  return null;
};

// Dashboard Modal
const DashboardModal = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const COLORS = ['#F97316', '#10B981', '#8B5CF6', '#3B82F6', '#EF4444'];

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      axios.get(`${API}/stats/dashboard`).then(r => setStats(r.data)).catch(() => toast.error("Failed to load stats")).finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div><h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 size={24}/> Market Insights</h2></div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full"><X size={20}/></button>
        </div>
        <div className="modal-body">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" size={32}/></div> : stats?.error ? <p className="text-center text-gray-500">No data</p> : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-700">€{stats?.lowest_rent?.rent_amount || 0}</div>
                  <div className="text-xs text-emerald-600">Lowest</div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-orange-700">€{stats?.avg_price_per_sqm || 0}</div>
                  <div className="text-xs text-orange-600">Avg €/m²</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">€{stats?.highest_rent?.rent_amount || 0}</div>
                  <div className="text-xs text-red-600">Highest</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Avg Rent by Area</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.avg_by_neighborhood?.slice(0,5) || []} layout="vertical">
                      <XAxis type="number" tickFormatter={v => `€${v}`} fontSize={11}/>
                      <YAxis type="category" dataKey="neighborhood" width={100} fontSize={11}/>
                      <Tooltip formatter={v => [`€${v}`, 'Avg']}/>
                      <Bar dataKey="avg_rent" radius={[0,4,4,0]}>
                        {(stats?.avg_by_neighborhood || []).slice(0,5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Listing Card
const ListingCard = ({ listing, onView, onShare }) => {
  const isOffering = listing.listing_type === "offering";
  return (
    <div className={`listing-card ${isOffering ? 'border-l-emerald-500' : 'border-l-purple-500'}`}>
      <div className="flex justify-between mb-2">
        <span className={`badge ${isOffering ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
          {isOffering ? '🏠 Offering' : '👀 Looking'}
        </span>
        <span className="badge bg-gray-100 text-gray-700">{listing.apartment_type}</span>
      </div>
      {listing.rent_amount && (
        <div className="mb-2">
          <div className="text-2xl font-bold">€{listing.rent_amount}</div>
          <div className="text-sm text-gray-500">{listing.price_per_sqm && `€${listing.price_per_sqm}/m² · `}{listing.apartment_size && `${listing.apartment_size}m²`}</div>
        </div>
      )}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <MapPin size={14} className={isOffering ? "text-emerald-500" : "text-purple-500"}/> {listing.neighborhood}
      </div>
      {(listing.description || listing.ai_description) && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{listing.description || listing.ai_description}</p>}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        {listing.contact_email && <a href={`mailto:${listing.contact_email}`} className="btn-sm"><Mail size={14}/></a>}
        {listing.contact_phone && <a href={`tel:${listing.contact_phone}`} className="btn-sm"><Phone size={14}/></a>}
        <button className="btn-sm ml-auto" onClick={() => onShare(listing)}><Share2 size={14}/></button>
        <button className="btn-sm" onClick={() => onView(listing)}><Eye size={14}/></button>
      </div>
    </div>
  );
};

// Create Listing Modal
const CreateModal = ({ isOpen, onClose, pinLocation, neighborhoods, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ listing_type: 'offering', apartment_type: '1 Zimmer', rent_type: 'warmmiete', rent_amount: '', apartment_size: '', furnished: null, building_type: '', description: '', contact_email: '', contact_phone: '' });

  useEffect(() => { if (isOpen) { setStep(1); setForm({ listing_type: 'offering', apartment_type: '1 Zimmer', rent_type: 'warmmiete', rent_amount: '', apartment_size: '', furnished: null, building_type: '', description: '', contact_email: '', contact_phone: '' }); } }, [isOpen]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ ...form, lat: pinLocation.lat, lng: pinLocation.lng, neighborhood: pinLocation.neighborhood, rent_amount: form.rent_amount ? parseFloat(form.rent_amount) : null, apartment_size: form.apartment_size ? parseFloat(form.apartment_size) : null });
      onClose();
      toast.success("Listing created! 🎉");
    } catch { toast.error("Failed"); }
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div><h2 className="text-xl font-bold">{step === 1 ? "What type?" : step === 2 ? "Details" : "Contact"}</h2><p className="text-sm text-gray-500">📍 {pinLocation?.neighborhood}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
        </div>
        <div className="modal-body">
          {step === 1 && (
            <div className="space-y-3">
              <div className={`type-card ${form.listing_type === 'offering' ? 'active border-emerald-500 bg-emerald-50' : ''}`} onClick={() => setForm({...form, listing_type: 'offering'})}>
                <span className="text-2xl">🏠</span><div><div className="font-semibold">Offering</div><div className="text-sm text-gray-500">List your place</div></div>
              </div>
              <div className={`type-card ${form.listing_type === 'looking' ? 'active border-purple-500 bg-purple-50' : ''}`} onClick={() => setForm({...form, listing_type: 'looking'})}>
                <span className="text-2xl">👀</span><div><div className="font-semibold">Looking</div><div className="text-sm text-gray-500">Find a place</div></div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div><label className="label">Type</label><select className="input" value={form.apartment_type} onChange={e => setForm({...form, apartment_type: e.target.value})}><option>WG room</option><option>studio</option><option>1 Zimmer</option><option>2 Zimmer</option><option>3+ Zimmer</option></select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Size (m²)</label><input className="input" type="number" value={form.apartment_size} onChange={e => setForm({...form, apartment_size: e.target.value})} placeholder="45"/></div>
                <div><label className="label">Rent (€)</label><input className="input" type="number" value={form.rent_amount} onChange={e => setForm({...form, rent_amount: e.target.value})} placeholder="850"/></div>
              </div>
              <div><label className="label">Rent Type</label><div className="flex gap-2"><button className={`flex-1 py-2 rounded-lg border ${form.rent_type === 'warmmiete' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200'}`} onClick={() => setForm({...form, rent_type: 'warmmiete'})}>Warm</button><button className={`flex-1 py-2 rounded-lg border ${form.rent_type === 'kaltmiete' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200'}`} onClick={() => setForm({...form, rent_type: 'kaltmiete'})}>Kalt</button></div></div>
              <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe..."/></div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-orange-50 rounded-lg text-sm text-orange-700"><strong>Optional:</strong> Add contact info</div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} placeholder="your@email.com"/></div>
              <div><label className="label">Phone</label><input className="input" type="tel" value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} placeholder="+49..."/></div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {step > 1 && <button className="btn-secondary" onClick={() => setStep(step-1)}>Back</button>}
          {step < 3 ? <button className="btn-primary ml-auto" onClick={() => setStep(step+1)}>Continue</button> : <button className="btn-primary ml-auto" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Posting...' : 'Post'}</button>}
        </div>
      </div>
    </div>
  );
};

// View Listing Modal
const ViewModal = ({ listing, isOpen, onClose }) => {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (listing) setComments(listing.comments || []); }, [listing]);

  const addComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const r = await axios.post(`${API}/listings/${listing.id}/comments`, { text: comment });
      setComments([...comments, r.data.comment]);
      setComment('');
      toast.success("Comment added!");
    } catch { toast.error("Failed"); }
    setSubmitting(false);
  };

  if (!isOpen || !listing) return null;
  const isOffering = listing.listing_type === "offering";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className={`modal-header ${isOffering ? 'bg-emerald-500' : 'bg-purple-500'} text-white`}>
          <div><span className="text-sm opacity-80">{isOffering ? '🏠 Offering' : '👀 Looking'}</span><h2 className="text-xl font-bold">{listing.apartment_type} in {listing.neighborhood}</h2></div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full"><X size={20}/></button>
        </div>
        <div className="modal-body max-h-96 overflow-y-auto">
          {listing.rent_amount && <div className="text-center py-4 border-b"><div className="text-4xl font-bold">€{listing.rent_amount}</div><div className="text-gray-500">/month · {listing.rent_type}</div></div>}
          {(listing.description || listing.ai_description) && <p className="py-4 text-gray-600">{listing.description || listing.ai_description}</p>}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><MessageCircle size={18}/> Comments ({comments.length})</h3>
            {comments.map((c, i) => <div key={i} className="bg-gray-50 rounded-lg p-3 mb-2"><div className="font-medium text-sm">{c.author_name}</div><p className="text-sm text-gray-600">{c.text}</p></div>)}
            <div className="flex gap-2 mt-3">
              <input className="input flex-1" value={comment} onChange={e => setComment(e.target.value)} placeholder="Comment..." onKeyPress={e => e.key === 'Enter' && addComment()}/>
              <button className="btn-primary px-4" onClick={addComment} disabled={submitting}>{submitting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}</button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {listing.contact_email && <a href={`mailto:${listing.contact_email}`} className="btn-secondary flex-1 justify-center"><Mail size={18}/> Email</a>}
          {listing.contact_phone && <a href={`tel:${listing.contact_phone}`} className="btn-primary flex-1 justify-center"><Phone size={18}/> Call</a>}
        </div>
      </div>
    </div>
  );
};

// Main App
function App() {
  const [listings, setListings] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mapCenter] = useState(BERLIN_CENTER);
  const [filter, setFilter] = useState({ type: '', neighborhood: '', search: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/seed`);
      const [l, n] = await Promise.all([axios.get(`${API}/listings`), axios.get(`${API}/neighborhoods`)]);
      setListings(l.data);
      setNeighborhoods(n.data);
    } catch (e) { console.error(e); toast.error("Failed to load"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!loading) {
      const params = {};
      if (filter.type) params.listing_type = filter.type;
      if (filter.neighborhood) params.neighborhood = filter.neighborhood;
      axios.get(`${API}/listings`, { params }).then(r => {
        let data = r.data;
        if (filter.search) data = data.filter(l => l.neighborhood.toLowerCase().includes(filter.search.toLowerCase()));
        setListings(data);
      });
    }
  }, [filter, loading]);

  const handleMapClick = (latlng) => {
    let nearest = "Mitte", minDist = Infinity;
    neighborhoods.forEach(n => { const d = Math.sqrt((latlng.lat - n.lat) ** 2 + (latlng.lng - n.lng) ** 2); if (d < minDist) { minDist = d; nearest = n.name; } });
    setPinLocation({ lat: latlng.lat, lng: latlng.lng, neighborhood: nearest });
    setShowCreate(true);
    setIsPlacingPin(false);
  };

  const handleCreate = async (data) => {
    const r = await axios.post(`${API}/listings`, data);
    setListings([r.data, ...listings]);
    setPinLocation(null);
  };

  const handleShare = (l) => {
    const text = `${l.listing_type === 'offering' ? 'Rental' : 'Looking'} in ${l.neighborhood} ${l.rent_amount ? `€${l.rent_amount}/mo` : ''} - ${l.apartment_type}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="app">
      <Toaster position="top-right"/>
      
      {/* Header */}
      <header className="header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center"><Home size={20} className="text-white"/></div>
          <div><h1 className="text-xl font-bold">berlin.rent</h1><p className="text-xs text-gray-500">Marketplace</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary hidden sm:flex" onClick={() => setShowDashboard(true)}><BarChart3 size={18}/> Insights</button>
          {isPlacingPin ? <button className="btn-secondary" onClick={() => setIsPlacingPin(false)}><X size={18}/> Cancel</button> : <button className="btn-primary" onClick={() => { setIsPlacingPin(true); toast.info("Click on map! 📍"); }}><Plus size={18}/> Pin & List</button>}
        </div>
      </header>

      {/* Pin Banner */}
      {isPlacingPin && <div className="pin-banner"><MapPin size={20} className="animate-bounce"/> Click map to place pin</div>}

      {/* Main */}
      <main className="main">
        {/* Map */}
        <div className="map-section">
          <MapContainer center={BERLIN_CENTER} zoom={BERLIN_ZOOM} style={{ height: '100%', width: '100%', cursor: isPlacingPin ? 'crosshair' : 'grab' }}>
            <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"/>
            <MapUpdater center={mapCenter} zoom={BERLIN_ZOOM}/>
            <MapClickHandler onMapClick={handleMapClick} isPlacingPin={isPlacingPin}/>
            {pinLocation && !showCreate && <Marker position={[pinLocation.lat, pinLocation.lng]} icon={createPinIcon()}/>}
            {listings.map(l => <Marker key={l.id} position={[l.lat, l.lng]} icon={l.listing_type === 'offering' ? createOfferingIcon() : createLookingIcon()} eventHandlers={{ click: () => setSelected(l) }}><Popup><div className="p-2"><div className="font-bold">{l.neighborhood}</div>{l.rent_amount && <div className="text-lg font-semibold">€{l.rent_amount}</div>}</div></Popup></Marker>)}
          </MapContainer>
          <div className="map-legend"><div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Offering</div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Looking</div></div>
          <div className="built-by">Built by <span className="text-orange-500 font-semibold">Sachin</span></div>
        </div>

        {/* Listings */}
        <div className="listings-section">
          {/* Filters */}
          <div className="filter-bar">
            <div className="search-box"><Search size={18} className="text-gray-400"/><input placeholder="Search..." value={filter.search} onChange={e => setFilter({...filter, search: e.target.value})}/></div>
            <select className="select" value={filter.type} onChange={e => setFilter({...filter, type: e.target.value})}><option value="">All</option><option value="offering">Offering</option><option value="looking">Looking</option></select>
            <select className="select" value={filter.neighborhood} onChange={e => setFilter({...filter, neighborhood: e.target.value})}><option value="">All Areas</option>{neighborhoods.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}</select>
            <button className="btn-sm" onClick={() => setFilter({ type: '', neighborhood: '', search: '' })}><X size={14}/></button>
          </div>
          
          {/* Stats */}
          <div className="stats-bar">
            <div className="stat"><span className="stat-value">{listings.length}</span><span className="stat-label">Total</span></div>
            <div className="stat"><span className="stat-value text-emerald-600">{listings.filter(l => l.listing_type === 'offering').length}</span><span className="stat-label">Offering</span></div>
            <div className="stat"><span className="stat-value text-purple-600">{listings.filter(l => l.listing_type === 'looking').length}</span><span className="stat-label">Looking</span></div>
          </div>

          {/* List */}
          {loading ? <div className="empty"><Loader2 className="animate-spin" size={32}/></div> : listings.length === 0 ? <div className="empty"><p>No listings yet</p><button className="btn-primary mt-4" onClick={() => setIsPlacingPin(true)}><Plus size={18}/> Add First</button></div> : (
            <div className="listings-grid">
              {listings.map(l => <ListingCard key={l.id} listing={l} onView={setSelected} onShare={handleShare}/>)}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bar */}
      <div className="mobile-bar">
        <button className="btn-secondary flex-1" onClick={() => setShowDashboard(true)}><BarChart3 size={18}/></button>
        <button className="btn-primary flex-1" onClick={() => { setIsPlacingPin(true); toast.info("Tap map! 📍"); }}><Plus size={18}/> Pin</button>
      </div>

      {/* Modals */}
      <CreateModal isOpen={showCreate} onClose={() => { setShowCreate(false); setPinLocation(null); }} pinLocation={pinLocation} neighborhoods={neighborhoods} onSubmit={handleCreate}/>
      <ViewModal listing={selected} isOpen={!!selected} onClose={() => setSelected(null)}/>
      <DashboardModal isOpen={showDashboard} onClose={() => setShowDashboard(false)}/>
    </div>
  );
}

export default App;
