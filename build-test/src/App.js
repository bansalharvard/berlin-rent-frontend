import { useEffect, useState, useCallback } from "react";
import "./App.css";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Plus, Search, X, Home, MapPin, Mail, Phone, Sparkles, Eye, Users, Loader2, BarChart3, Share2, MessageCircle, Send } from "lucide-react";
import { Toaster, toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Berlin center coordinates
const BERLIN_CENTER = [52.52, 13.405];
const BERLIN_ZOOM = 12;

// Custom marker icons
const createOfferingIcon = () => L.divIcon({
  className: "custom-div-icon",
  html: `<div style="
    width: 32px; height: 32px;
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    border: 3px solid white;
    display: flex; align-items: center; justify-content: center;
  "><div style="transform: rotate(45deg); color: white; font-size: 14px;">🏠</div></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const createLookingIcon = () => L.divIcon({
  className: "custom-div-icon",
  html: `<div style="
    width: 32px; height: 32px;
    background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    border: 3px solid white;
    display: flex; align-items: center; justify-content: center;
  "><div style="transform: rotate(45deg); color: white; font-size: 14px;">👀</div></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const createPinIcon = () => L.divIcon({
  className: "custom-div-icon",
  html: `<div style="
    width: 40px; height: 40px;
    background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
    border-radius: 50%;
    box-shadow: 0 4px 20px rgba(249, 115, 22, 0.5);
    border: 4px solid white;
    display: flex; align-items: center; justify-content: center;
    animation: pulse 1.5s infinite;
  "><div style="color: white; font-size: 18px;">📍</div></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Map click handler component
const MapClickHandler = ({ onMapClick, isPlacingPin }) => {
  useMapEvents({
    click: (e) => {
      if (isPlacingPin) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

// Map updater component
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true, duration: 0.5 });
    }
  }, [center, zoom, map]);
  return null;
};

// Dashboard Modal Component
const DashboardModal = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);
  
  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/stats/dashboard`);
      setStats(response.data);
    } catch (err) {
      toast.error("Failed to load stats");
    } finally {
      setIsLoading(false);
    }
  };
  
  const COLORS = ['#F97316', '#10B981', '#8B5CF6', '#3B82F6', '#EF4444', '#F59E0B'];
  
  if (!isOpen) return null;
  
  return (
    <div className="form-modal" onClick={onClose} data-testid="dashboard-modal">
      <div className="form-content animate-slide-up" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="form-header bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 size={24} /> Market Insights
            </h2>
            <p className="text-sm opacity-80 mt-1">Real-time Berlin rental market data</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="form-body">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-orange-500" />
            </div>
          ) : stats?.error ? (
            <div className="text-center py-8 text-gray-500">No data available yet</div>
          ) : (
            <div className="space-y-6">
              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-700">€{stats?.lowest_rent?.rent_amount || 0}</div>
                  <div className="text-xs text-emerald-600 font-medium">Lowest Rent</div>
                  <div className="text-xs text-emerald-500 mt-1">{stats?.lowest_rent?.neighborhood}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-orange-700">€{stats?.avg_price_per_sqm || 0}</div>
                  <div className="text-xs text-orange-600 font-medium">Avg €/m²</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">€{stats?.highest_rent?.rent_amount || 0}</div>
                  <div className="text-xs text-red-600 font-medium">Highest Rent</div>
                  <div className="text-xs text-red-500 mt-1">{stats?.highest_rent?.neighborhood}</div>
                </div>
              </div>
              
              {/* Chart - Avg Rent by Neighborhood */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Average Rent by Neighborhood</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.avg_by_neighborhood?.slice(0, 6) || []} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `€${v}`} fontSize={11} />
                      <YAxis type="category" dataKey="neighborhood" width={90} fontSize={11} />
                      <Tooltip formatter={(v) => [`€${v}`, 'Avg Rent']} />
                      <Bar dataKey="avg_rent" radius={[0, 4, 4, 0]}>
                        {(stats?.avg_by_neighborhood || []).slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Avg by Type */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Average Rent by Type</h3>
                <div className="grid grid-cols-2 gap-2">
                  {stats?.avg_by_type?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <span className="text-sm font-medium text-gray-700">{item.type}</span>
                      <span className="text-sm font-bold text-orange-600">€{item.avg_rent}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Tips */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Tips for Renters</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {stats?.lowest_rent?.neighborhood} has the most affordable options</li>
                  <li>• Average price is €{stats?.avg_price_per_sqm}/m² - compare before renting</li>
                  <li>• WG rooms offer the best value for students</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Listing Card Component
const ListingCard = ({ listing, onView, onShare }) => {
  const isOffering = listing.listing_type === "offering";
  
  return (
    <div 
      className={`listing-card ${isOffering ? 'offering' : 'looking'}`}
      data-testid={`listing-card-${listing.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`badge ${isOffering ? 'badge-offering' : 'badge-looking'}`}>
            {isOffering ? '🏠 Offering' : '👀 Looking'}
          </span>
        </div>
        <div className="flex gap-1">
          {listing.apartment_type && (
            <span className="badge badge-default">{listing.apartment_type}</span>
          )}
        </div>
      </div>
      
      {listing.rent_amount && (
        <div className="mb-3">
          <div className="price-large" data-testid={`price-${listing.id}`}>€{listing.rent_amount.toLocaleString()}</div>
          <div className="price-sqm">
            {listing.price_per_sqm && `€${listing.price_per_sqm}/m² · `}
            {listing.apartment_size && `${listing.apartment_size}m²`}
            {listing.rent_type && ` · ${listing.rent_type === 'warmmiete' ? 'Warm' : 'Kalt'}`}
          </div>
        </div>
      )}
      
      {listing.suggested_price && !listing.rent_amount && (
        <div className="mb-3 p-2 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-1 text-purple-600 text-xs font-medium mb-1">
            <Sparkles size={12} /> AI Suggested Budget
          </div>
          <div className="text-lg font-semibold text-purple-700">€{listing.suggested_price}/mo</div>
        </div>
      )}
      
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
        <MapPin size={14} className={isOffering ? "text-emerald-500" : "text-purple-500"} />
        <span className="font-medium">{listing.neighborhood}</span>
        {listing.building_type && (
          <span className="ml-auto badge badge-sm">{listing.building_type}</span>
        )}
      </div>
      
      {(listing.description || listing.ai_description) && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {listing.description || listing.ai_description}
          {listing.ai_description && !listing.description && (
            <span className="ml-1 text-xs text-purple-500">✨ AI</span>
          )}
        </p>
      )}
      
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        {listing.contact_email && (
          <a href={`mailto:${listing.contact_email}`} className="contact-btn" data-testid={`email-${listing.id}`}>
            <Mail size={14} /> Email
          </a>
        )}
        {listing.contact_phone && (
          <a href={`tel:${listing.contact_phone}`} className="contact-btn" data-testid={`phone-${listing.id}`}>
            <Phone size={14} /> Call
          </a>
        )}
        <div className="ml-auto flex gap-2">
          <button 
            className="icon-btn"
            onClick={(e) => { e.stopPropagation(); onShare(listing); }}
            data-testid={`share-${listing.id}`}
            title="Share on WhatsApp"
          >
            <Share2 size={14} />
          </button>
          {listing.comments?.length > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <MessageCircle size={12} /> {listing.comments.length}
            </span>
          )}
          <button 
            className="text-xs text-gray-500 hover:text-orange-500 flex items-center gap-1"
            onClick={() => onView(listing)}
            data-testid={`view-${listing.id}`}
          >
            <Eye size={14} /> View
          </button>
        </div>
      </div>
    </div>
  );
};

// Create Listing Modal
const CreateListingModal = ({ isOpen, onClose, pinLocation, neighborhoods, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGettingPrice, setIsGettingPrice] = useState(false);
  const [formData, setFormData] = useState({
    listing_type: 'offering',
    apartment_type: '1 Zimmer',
    rent_type: 'warmmiete',
    rent_amount: '',
    apartment_size: '',
    furnished: null,
    building_type: '',
    move_in_date: '',
    description: '',
    contact_email: '',
    contact_phone: ''
  });
  const [suggestedPrice, setSuggestedPrice] = useState(null);
  
  useEffect(() => {
    if (isOpen && pinLocation) {
      setStep(1);
      setFormData({
        listing_type: 'offering',
        apartment_type: '1 Zimmer',
        rent_type: 'warmmiete',
        rent_amount: '',
        apartment_size: '',
        furnished: null,
        building_type: '',
        move_in_date: '',
        description: '',
        contact_email: '',
        contact_phone: ''
      });
      setSuggestedPrice(null);
    }
  }, [isOpen, pinLocation]);
  
  const getAIDescription = async () => {
    setIsGeneratingDesc(true);
    try {
      const response = await axios.post(`${API}/ai/generate-description`, {
        listing_type: formData.listing_type,
        neighborhood: pinLocation?.neighborhood || 'Berlin',
        apartment_type: formData.apartment_type,
        apartment_size: formData.apartment_size ? parseFloat(formData.apartment_size) : null,
        rent_amount: formData.rent_amount ? parseFloat(formData.rent_amount) : null,
        rent_type: formData.rent_type,
        furnished: formData.furnished,
        building_type: formData.building_type || null
      });
      setFormData({ ...formData, description: response.data.description });
      toast.success("AI description generated!");
    } catch (err) {
      toast.error("Couldn't generate description");
    } finally {
      setIsGeneratingDesc(false);
    }
  };
  
  const getAIPrice = async () => {
    if (!formData.apartment_size) {
      toast.error("Please enter apartment size first");
      return;
    }
    setIsGettingPrice(true);
    try {
      const response = await axios.post(`${API}/ai/suggest-price`, {
        neighborhood: pinLocation?.neighborhood || 'Mitte',
        apartment_type: formData.apartment_type,
        apartment_size: parseFloat(formData.apartment_size),
        rent_type: formData.rent_type,
        furnished: formData.furnished,
        building_type: formData.building_type || null
      });
      setSuggestedPrice(response.data.suggested_price);
      toast.success(`AI suggests €${response.data.suggested_price}/month`);
    } catch (err) {
      toast.error("Couldn't get price suggestion");
    } finally {
      setIsGettingPrice(false);
    }
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        lat: pinLocation.lat,
        lng: pinLocation.lng,
        neighborhood: pinLocation.neighborhood,
        rent_amount: formData.rent_amount ? parseFloat(formData.rent_amount) : null,
        apartment_size: formData.apartment_size ? parseFloat(formData.apartment_size) : null,
        furnished: formData.furnished,
        building_type: formData.building_type || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null
      });
      onClose();
      toast.success("Listing created! 🎉");
    } catch (err) {
      toast.error("Failed to create listing");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="form-modal" onClick={onClose} data-testid="create-listing-modal">
      <div className="form-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === 1 ? "What are you posting?" : step === 2 ? "Listing Details" : "Contact Info"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">📍 {pinLocation?.neighborhood || 'Berlin'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" data-testid="close-modal-btn">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        
        <div className="form-body">
          {step === 1 && (
            <div className="space-y-4">
              <div 
                className={`type-card ${formData.listing_type === 'offering' ? 'active offering' : ''}`}
                onClick={() => setFormData({ ...formData, listing_type: 'offering' })}
                data-testid="type-offering"
              >
                <div className="type-icon offering">🏠</div>
                <div>
                  <div className="font-semibold">I'm Offering a Place</div>
                  <div className="text-sm text-gray-500">List your apartment or room for rent</div>
                </div>
              </div>
              
              <div 
                className={`type-card ${formData.listing_type === 'looking' ? 'active looking' : ''}`}
                onClick={() => setFormData({ ...formData, listing_type: 'looking' })}
                data-testid="type-looking"
              >
                <div className="type-icon looking">👀</div>
                <div>
                  <div className="font-semibold">I'm Looking for a Place</div>
                  <div className="text-sm text-gray-500">Post what you're searching for</div>
                </div>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-4">
              <div className="form-field">
                <label>Apartment Type</label>
                <select value={formData.apartment_type} onChange={(e) => setFormData({ ...formData, apartment_type: e.target.value })} data-testid="form-apartment-type">
                  <option value="WG room">WG Room</option>
                  <option value="studio">Studio</option>
                  <option value="1 Zimmer">1 Zimmer</option>
                  <option value="2 Zimmer">2 Zimmer</option>
                  <option value="3+ Zimmer">3+ Zimmer</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label>Size (m²)</label>
                  <input type="number" value={formData.apartment_size} onChange={(e) => setFormData({ ...formData, apartment_size: e.target.value })} placeholder="e.g., 45" data-testid="form-size" />
                </div>
                
                <div className="form-field">
                  <label className="flex items-center justify-between">
                    Rent (€/month)
                    <button type="button" className="ai-btn" onClick={getAIPrice} disabled={isGettingPrice} data-testid="ai-price-btn">
                      {isGettingPrice ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI
                    </button>
                  </label>
                  <input type="number" value={formData.rent_amount} onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })} placeholder={suggestedPrice ? `Suggested: €${suggestedPrice}` : "e.g., 850"} data-testid="form-rent" />
                </div>
              </div>
              
              <div className="form-field">
                <label>Rent Type</label>
                <div className="segmented-control w-full">
                  <button type="button" className={formData.rent_type === 'warmmiete' ? 'active' : ''} onClick={() => setFormData({ ...formData, rent_type: 'warmmiete' })}>Warmmiete</button>
                  <button type="button" className={formData.rent_type === 'kaltmiete' ? 'active' : ''} onClick={() => setFormData({ ...formData, rent_type: 'kaltmiete' })}>Kaltmiete</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label>Furnished?</label>
                  <div className="segmented-control w-full">
                    <button type="button" className={formData.furnished === false ? 'active' : ''} onClick={() => setFormData({ ...formData, furnished: false })}>No</button>
                    <button type="button" className={formData.furnished === true ? 'active' : ''} onClick={() => setFormData({ ...formData, furnished: true })}>Yes</button>
                  </div>
                </div>
                <div className="form-field">
                  <label>Building</label>
                  <select value={formData.building_type} onChange={(e) => setFormData({ ...formData, building_type: e.target.value })}>
                    <option value="">Any</option>
                    <option value="altbau">Altbau</option>
                    <option value="neubau">Neubau</option>
                  </select>
                </div>
              </div>
              
              <div className="form-field">
                <label className="flex items-center justify-between">
                  Description
                  <button type="button" className="ai-btn" onClick={getAIDescription} disabled={isGeneratingDesc} data-testid="ai-desc-btn">
                    {isGeneratingDesc ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Write
                  </button>
                </label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe your place or what you're looking for..." rows={3} className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" data-testid="form-description" />
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-xl mb-4">
                <p className="text-sm text-orange-700"><strong>Optional:</strong> Add contact info so interested people can reach you.</p>
              </div>
              <div className="form-field">
                <label className="flex items-center gap-2"><Mail size={14} /> Email (optional)</label>
                <input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} placeholder="your@email.com" data-testid="form-email" />
              </div>
              <div className="form-field">
                <label className="flex items-center gap-2"><Phone size={14} /> Phone (optional)</label>
                <input type="tel" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} placeholder="+49 170 1234567" data-testid="form-phone" />
              </div>
            </div>
          )}
        </div>
        
        <div className="form-footer">
          {step > 1 && <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>Back</button>}
          {step < 3 ? (
            <button type="button" className="btn btn-primary ml-auto" onClick={() => setStep(step + 1)} data-testid="next-step-btn">Continue</button>
          ) : (
            <button type="button" className="btn btn-primary ml-auto" onClick={handleSubmit} disabled={isSubmitting} data-testid="submit-listing-btn">{isSubmitting ? 'Posting...' : 'Post Listing'}</button>
          )}
        </div>
      </div>
    </div>
  );
};

// View Listing Modal with Comments
const ViewListingModal = ({ listing, isOpen, onClose, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (listing) {
      setComments(listing.comments || []);
    }
  }, [listing]);
  
  const handleShare = () => {
    const text = `Check out this ${listing.listing_type === 'offering' ? 'rental' : 'rental request'} in ${listing.neighborhood}! ${listing.rent_amount ? `€${listing.rent_amount}/month` : ''} - ${listing.apartment_type}`;
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
  };
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API}/listings/${listing.id}/comments`, {
        text: newComment,
        author_name: authorName || 'Anonymous'
      });
      setComments([...comments, response.data.comment]);
      setNewComment('');
      setAuthorName('');
      toast.success("Comment added!");
      if (onCommentAdded) onCommentAdded(listing.id, response.data.comment);
    } catch (err) {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen || !listing) return null;
  
  const isOffering = listing.listing_type === "offering";
  
  return (
    <div className="form-modal" onClick={onClose} data-testid="view-listing-modal">
      <div className="form-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className={`form-header ${isOffering ? 'bg-emerald-500' : 'bg-purple-500'} text-white`}>
          <div>
            <span className="text-sm opacity-80">{isOffering ? '🏠 Offering' : '👀 Looking for'}</span>
            <h2 className="text-xl font-bold">{listing.apartment_type} in {listing.neighborhood}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2 hover:bg-white/20 rounded-full" title="Share on WhatsApp">
              <Share2 size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="form-body max-h-[60vh] overflow-y-auto">
          {listing.rent_amount && (
            <div className="text-center py-4 border-b border-gray-100">
              <div className="text-4xl font-bold text-gray-900">€{listing.rent_amount}</div>
              <div className="text-gray-500">per month · {listing.rent_type === 'warmmiete' ? 'Warm rent' : 'Cold rent'}</div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 py-4">
            {listing.apartment_size && (
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-2xl font-semibold">{listing.apartment_size}m²</div>
                <div className="text-xs text-gray-500">Size</div>
              </div>
            )}
            {listing.price_per_sqm && (
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-2xl font-semibold">€{listing.price_per_sqm}</div>
                <div className="text-xs text-gray-500">per m²</div>
              </div>
            )}
          </div>
          
          {(listing.description || listing.ai_description) && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600">{listing.description || listing.ai_description}</p>
            </div>
          )}
          
          {/* Comments Section */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <MessageCircle size={18} /> Comments ({comments.length})
            </h3>
            
            {comments.length > 0 && (
              <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                {comments.map((comment, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-700">{comment.author_name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add Comment */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 p-2 text-sm border border-gray-200 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  data-testid="comment-input"
                />
                <button
                  onClick={handleAddComment}
                  disabled={isSubmitting || !newComment.trim()}
                  className="btn btn-primary px-4"
                  data-testid="submit-comment-btn"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="form-footer">
          {listing.contact_email && (
            <a href={`mailto:${listing.contact_email}`} className="btn btn-secondary flex-1 justify-center">
              <Mail size={18} /> Email
            </a>
          )}
          {listing.contact_phone && (
            <a href={`tel:${listing.contact_phone}`} className="btn btn-primary flex-1 justify-center">
              <Phone size={18} /> Call
            </a>
          )}
          {!listing.contact_email && !listing.contact_phone && (
            <div className="text-center text-gray-400 text-sm w-full">No contact information provided</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Filter Bar Component
const FilterBar = ({ filters, setFilters, neighborhoods }) => {
  return (
    <div className="filter-bar" data-testid="filter-bar">
      <div className="search-input flex-1 min-w-[160px]">
        <Search size={18} className="text-gray-400" />
        <input type="text" placeholder="Search..." value={filters.searchQuery} onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })} data-testid="search-input" />
      </div>
      
      <div className="segmented-control" data-testid="filter-listing-type">
        <button className={filters.listingType === '' ? 'active' : ''} onClick={() => setFilters({ ...filters, listingType: '' })}>All</button>
        <button className={filters.listingType === 'offering' ? 'active' : ''} onClick={() => setFilters({ ...filters, listingType: 'offering' })} data-testid="filter-offering">🏠</button>
        <button className={filters.listingType === 'looking' ? 'active' : ''} onClick={() => setFilters({ ...filters, listingType: 'looking' })} data-testid="filter-looking">👀</button>
      </div>
      
      <select className="filter-select" value={filters.neighborhood} onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })} data-testid="filter-neighborhood">
        <option value="">All Areas</option>
        {neighborhoods.map(n => (<option key={n.name} value={n.name}>{n.name}</option>))}
      </select>
      
      <select className="filter-select" value={filters.apartmentType} onChange={(e) => setFilters({ ...filters, apartmentType: e.target.value })} data-testid="filter-apartment-type">
        <option value="">All Types</option>
        <option value="WG room">WG Room</option>
        <option value="studio">Studio</option>
        <option value="1 Zimmer">1 Zimmer</option>
        <option value="2 Zimmer">2 Zimmer</option>
        <option value="3+ Zimmer">3+ Zimmer</option>
      </select>
      
      <button className="clear-btn" onClick={() => setFilters({ listingType: '', neighborhood: '', apartmentType: '', searchQuery: '' })} data-testid="clear-filters-btn">
        <X size={14} /> Clear
      </button>
    </div>
  );
};

// Stats Component
const Stats = ({ listings }) => {
  const offerings = listings.filter(l => l.listing_type === 'offering').length;
  const looking = listings.filter(l => l.listing_type === 'looking').length;
  
  return (
    <div className="stats-bar" data-testid="stats-summary">
      <div className="stat-item">
        <span className="stat-value">{listings.length}</span>
        <span className="stat-label">Total</span>
      </div>
      <div className="stat-item">
        <span className="stat-value text-emerald-600">{offerings}</span>
        <span className="stat-label">Offering</span>
      </div>
      <div className="stat-item">
        <span className="stat-value text-purple-600">{looking}</span>
        <span className="stat-label">Looking</span>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [listings, setListings] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [mapCenter, setMapCenter] = useState(BERLIN_CENTER);
  const [filters, setFilters] = useState({
    listingType: '',
    neighborhood: '',
    apartmentType: '',
    searchQuery: ''
  });
  
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      await axios.post(`${API}/seed`);
      const [listingsRes, neighborhoodsRes] = await Promise.all([
        axios.get(`${API}/listings`),
        axios.get(`${API}/neighborhoods`)
      ]);
      setListings(listingsRes.data);
      setNeighborhoods(neighborhoodsRes.data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const fetchListings = useCallback(async () => {
    try {
      const params = {};
      if (filters.listingType) params.listing_type = filters.listingType;
      if (filters.neighborhood) params.neighborhood = filters.neighborhood;
      if (filters.apartmentType) params.apartment_type = filters.apartmentType;
      
      const response = await axios.get(`${API}/listings`, { params });
      let data = response.data;
      
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        data = data.filter(l => l.neighborhood.toLowerCase().includes(query) || l.apartment_type.toLowerCase().includes(query) || (l.description && l.description.toLowerCase().includes(query)));
      }
      
      setListings(data);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    }
  }, [filters]);
  
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!isLoading) fetchListings(); }, [filters, isLoading, fetchListings]);
  
  const handleMapClick = (latlng) => {
    let nearest = "Mitte";
    let minDist = Infinity;
    for (const n of neighborhoods) {
      const dist = Math.sqrt(Math.pow(latlng.lat - n.lat, 2) + Math.pow(latlng.lng - n.lng, 2));
      if (dist < minDist) { minDist = dist; nearest = n.name; }
    }
    setPinLocation({ lat: latlng.lat, lng: latlng.lng, neighborhood: nearest });
    setShowCreateModal(true);
    setIsPlacingPin(false);
  };
  
  const handleCreateListing = async (data) => {
    const response = await axios.post(`${API}/listings`, data);
    setListings(prev => [response.data, ...prev]);
    setPinLocation(null);
  };
  
  const handleShare = (listing) => {
    const text = `Check out this ${listing.listing_type === 'offering' ? 'rental' : 'rental request'} in ${listing.neighborhood}! ${listing.rent_amount ? `€${listing.rent_amount}/month` : ''} - ${listing.apartment_type}`;
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
  };
  
  const handleCommentAdded = (listingId, comment) => {
    setListings(prev => prev.map(l => {
      if (l.id === listingId) {
        return { ...l, comments: [...(l.comments || []), comment] };
      }
      return l;
    }));
  };
  
  return (
    <div className="app-container" data-testid="app-container">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '12px' } }} />
      
      {/* Header */}
      <header className="app-header" data-testid="app-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Home size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">berlin.rent</h1>
            <p className="text-xs text-gray-500 -mt-0.5">dein Marktplatz</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary hidden sm:flex" onClick={() => setShowDashboard(true)} data-testid="dashboard-btn">
            <BarChart3 size={18} /> Insights
          </button>
          {isPlacingPin ? (
            <button className="btn btn-secondary" onClick={() => setIsPlacingPin(false)} data-testid="cancel-pin-btn">
              <X size={18} /> Cancel
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => { setIsPlacingPin(true); toast.info("Click on the map to place your listing! 📍"); }} data-testid="add-listing-btn">
              <Plus size={18} /> Pin & List
            </button>
          )}
        </div>
      </header>
      
      {/* Pin Banner */}
      {isPlacingPin && (
        <div className="pin-banner" data-testid="pin-banner">
          <MapPin size={20} className="animate-bounce" />
          <span>Click anywhere on the map to drop your pin</span>
        </div>
      )}
      
      {/* Main Content */}
      <main className="main-content">
        {/* Map Section */}
        <div className="map-section" data-testid="map-section">
          <MapContainer center={BERLIN_CENTER} zoom={BERLIN_ZOOM} style={{ height: '100%', width: '100%', cursor: isPlacingPin ? 'crosshair' : 'grab' }}>
            <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <MapUpdater center={mapCenter} zoom={filters.neighborhood ? 14 : BERLIN_ZOOM} />
            <MapClickHandler onMapClick={handleMapClick} isPlacingPin={isPlacingPin} />
            
            {pinLocation && !showCreateModal && (
              <Marker position={[pinLocation.lat, pinLocation.lng]} icon={createPinIcon()} />
            )}
            
            {listings.map(listing => (
              <Marker key={listing.id} position={[listing.lat, listing.lng]} icon={listing.listing_type === 'offering' ? createOfferingIcon() : createLookingIcon()} eventHandlers={{ click: () => setSelectedListing(listing) }}>
                <Popup>
                  <div className="p-2 min-w-[180px]">
                    <div className="font-bold">{listing.neighborhood}</div>
                    <div className="text-sm text-gray-600">{listing.apartment_type}</div>
                    {listing.rent_amount && <div className="text-lg font-semibold mt-1">€{listing.rent_amount}</div>}
                    <button className="mt-2 text-xs text-orange-500 font-medium" onClick={() => setSelectedListing(listing)}>View Details →</button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          {/* Legend */}
          <div className="map-legend" data-testid="map-legend">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
              <span>Offering</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <span>Looking</span>
            </div>
          </div>
          
          {/* Built by Sachin */}
          <div className="built-by" data-testid="built-by">
            Built by <span>Sachin</span>
          </div>
        </div>
        
        {/* Listings Section */}
        <div className="listings-section" data-testid="listings-section">
          <FilterBar filters={filters} setFilters={setFilters} neighborhoods={neighborhoods} />
          <Stats listings={listings} />
          
          {isLoading ? (
            <div className="empty-state">
              <div className="spinner"></div>
              <p className="mt-4 text-sm font-medium">Loading listings...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="empty-state" data-testid="empty-state">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Users size={32} className="text-gray-400" />
              </div>
              <p className="font-semibold text-gray-700">No listings yet</p>
              <p className="text-sm text-gray-500 mt-1">Be the first to pin your listing!</p>
              <button className="btn btn-primary mt-4" onClick={() => setIsPlacingPin(true)}>
                <Plus size={18} /> Pin & List
              </button>
            </div>
          ) : (
            <div data-testid="listings-grid" className="pb-24 lg:pb-4">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing} onView={setSelectedListing} onShare={handleShare} />
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Mobile bottom action bar */}
      <div className="mobile-action-bar lg:hidden">
        <button className="btn btn-secondary flex-1" onClick={() => setShowDashboard(true)} data-testid="mobile-insights-btn">
          <BarChart3 size={18} /> Insights
        </button>
        {isPlacingPin ? (
          <button className="btn btn-secondary flex-1" onClick={() => setIsPlacingPin(false)}>
            <X size={18} /> Cancel
          </button>
        ) : (
          <button className="btn btn-primary flex-1" onClick={() => { setIsPlacingPin(true); toast.info("Tap on the map! 📍"); }} data-testid="mobile-add-btn">
            <Plus size={18} /> Pin & List
          </button>
        )}
      </div>
      
      {/* Modals */}
      <CreateListingModal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setPinLocation(null); }} pinLocation={pinLocation} neighborhoods={neighborhoods} onSubmit={handleCreateListing} />
      <ViewListingModal listing={selectedListing} isOpen={!!selectedListing} onClose={() => setSelectedListing(null)} onCommentAdded={handleCommentAdded} />
      <DashboardModal isOpen={showDashboard} onClose={() => setShowDashboard(false)} />
    </div>
  );
}

export default App;
