import { useEffect, useState, useCallback, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Plus, Search, X, Home, MapPin, Mail, Phone, Sparkles, Eye, Users, Building2, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";

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

// Listing Card Component
const ListingCard = ({ listing, onView }) => {
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
        {!listing.contact_email && !listing.contact_phone && (
          <span className="text-xs text-gray-400">No contact provided</span>
        )}
        <button 
          className="ml-auto text-xs text-gray-500 hover:text-orange-500 flex items-center gap-1"
          onClick={() => onView(listing)}
          data-testid={`view-${listing.id}`}
        >
          <Eye size={14} /> View
        </button>
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
  const [aiDescription, setAiDescription] = useState('');
  
  // Reset form when modal opens with new pin
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
      setAiDescription('');
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
      setAiDescription(response.data.description);
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
            <p className="text-sm text-gray-500 mt-1">
              📍 {pinLocation?.neighborhood || 'Berlin'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" data-testid="close-modal-btn">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        
        <div className="form-body">
          {/* Step 1: Type Selection */}
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
          
          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="form-field">
                <label>Apartment Type</label>
                <select
                  value={formData.apartment_type}
                  onChange={(e) => setFormData({ ...formData, apartment_type: e.target.value })}
                  data-testid="form-apartment-type"
                >
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
                  <input
                    type="number"
                    value={formData.apartment_size}
                    onChange={(e) => setFormData({ ...formData, apartment_size: e.target.value })}
                    placeholder="e.g., 45"
                    data-testid="form-size"
                  />
                </div>
                
                <div className="form-field">
                  <label className="flex items-center justify-between">
                    Rent (€/month)
                    <button 
                      type="button" 
                      className="ai-btn"
                      onClick={getAIPrice}
                      disabled={isGettingPrice}
                      data-testid="ai-price-btn"
                    >
                      {isGettingPrice ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      AI Suggest
                    </button>
                  </label>
                  <input
                    type="number"
                    value={formData.rent_amount}
                    onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                    placeholder={suggestedPrice ? `Suggested: €${suggestedPrice}` : "e.g., 850"}
                    data-testid="form-rent"
                  />
                </div>
              </div>
              
              <div className="form-field">
                <label>Rent Type</label>
                <div className="segmented-control w-full">
                  <button 
                    type="button"
                    className={formData.rent_type === 'warmmiete' ? 'active' : ''}
                    onClick={() => setFormData({ ...formData, rent_type: 'warmmiete' })}
                  >Warmmiete</button>
                  <button 
                    type="button"
                    className={formData.rent_type === 'kaltmiete' ? 'active' : ''}
                    onClick={() => setFormData({ ...formData, rent_type: 'kaltmiete' })}
                  >Kaltmiete</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label>Furnished?</label>
                  <div className="segmented-control w-full">
                    <button 
                      type="button"
                      className={formData.furnished === false ? 'active' : ''}
                      onClick={() => setFormData({ ...formData, furnished: false })}
                    >No</button>
                    <button 
                      type="button"
                      className={formData.furnished === true ? 'active' : ''}
                      onClick={() => setFormData({ ...formData, furnished: true })}
                    >Yes</button>
                  </div>
                </div>
                
                <div className="form-field">
                  <label>Building</label>
                  <select
                    value={formData.building_type}
                    onChange={(e) => setFormData({ ...formData, building_type: e.target.value })}
                  >
                    <option value="">Any</option>
                    <option value="altbau">Altbau</option>
                    <option value="neubau">Neubau</option>
                  </select>
                </div>
              </div>
              
              <div className="form-field">
                <label className="flex items-center justify-between">
                  Description
                  <button 
                    type="button" 
                    className="ai-btn"
                    onClick={getAIDescription}
                    disabled={isGeneratingDesc}
                    data-testid="ai-desc-btn"
                  >
                    {isGeneratingDesc ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    AI Write
                  </button>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your place or what you're looking for..."
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  data-testid="form-description"
                />
              </div>
            </div>
          )}
          
          {/* Step 3: Contact */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-xl mb-4">
                <p className="text-sm text-orange-700">
                  <strong>Optional:</strong> Add contact info so interested people can reach you. Your listing will be visible to everyone.
                </p>
              </div>
              
              <div className="form-field">
                <label className="flex items-center gap-2">
                  <Mail size={14} /> Email (optional)
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="your@email.com"
                  data-testid="form-email"
                />
              </div>
              
              <div className="form-field">
                <label className="flex items-center gap-2">
                  <Phone size={14} /> Phone (optional)
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+49 170 1234567"
                  data-testid="form-phone"
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="form-footer">
          {step > 1 && (
            <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < 3 ? (
            <button 
              type="button" 
              className="btn btn-primary ml-auto"
              onClick={() => setStep(step + 1)}
              data-testid="next-step-btn"
            >
              Continue
            </button>
          ) : (
            <button 
              type="button" 
              className="btn btn-primary ml-auto"
              onClick={handleSubmit}
              disabled={isSubmitting}
              data-testid="submit-listing-btn"
            >
              {isSubmitting ? 'Posting...' : 'Post Listing'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// View Listing Modal
const ViewListingModal = ({ listing, isOpen, onClose }) => {
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
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="form-body">
          {listing.rent_amount && (
            <div className="text-center py-4 border-b border-gray-100">
              <div className="text-4xl font-bold text-gray-900">€{listing.rent_amount}</div>
              <div className="text-gray-500">
                per month · {listing.rent_type === 'warmmiete' ? 'Warm rent' : 'Cold rent'}
              </div>
            </div>
          )}
          
          {listing.suggested_price && !listing.rent_amount && (
            <div className="text-center py-4 border-b border-gray-100 bg-purple-50 -mx-6 px-6">
              <div className="flex items-center justify-center gap-1 text-purple-600 text-sm mb-1">
                <Sparkles size={14} /> AI Suggested Budget
              </div>
              <div className="text-3xl font-bold text-purple-700">€{listing.suggested_price}</div>
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
          
          <div className="flex flex-wrap gap-2 mb-4">
            {listing.furnished !== null && (
              <span className="badge badge-default">{listing.furnished ? 'Furnished' : 'Unfurnished'}</span>
            )}
            {listing.building_type && (
              <span className="badge badge-default">{listing.building_type}</span>
            )}
          </div>
          
          {(listing.description || listing.ai_description) && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600">
                {listing.description || listing.ai_description}
                {listing.ai_description && !listing.description && (
                  <span className="ml-1 text-xs text-purple-500">✨ AI generated</span>
                )}
              </p>
            </div>
          )}
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
        <input
          type="text"
          placeholder="Search..."
          value={filters.searchQuery}
          onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
          data-testid="search-input"
        />
      </div>
      
      <div className="segmented-control" data-testid="filter-listing-type">
        <button 
          className={filters.listingType === '' ? 'active' : ''}
          onClick={() => setFilters({ ...filters, listingType: '' })}
        >All</button>
        <button 
          className={filters.listingType === 'offering' ? 'active' : ''}
          onClick={() => setFilters({ ...filters, listingType: 'offering' })}
          data-testid="filter-offering"
        >🏠 Offers</button>
        <button 
          className={filters.listingType === 'looking' ? 'active' : ''}
          onClick={() => setFilters({ ...filters, listingType: 'looking' })}
          data-testid="filter-looking"
        >👀 Looking</button>
      </div>
      
      <select
        className="filter-select"
        value={filters.neighborhood}
        onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })}
        data-testid="filter-neighborhood"
      >
        <option value="">All Areas</option>
        {neighborhoods.map(n => (
          <option key={n.name} value={n.name}>{n.name}</option>
        ))}
      </select>
      
      <select
        className="filter-select"
        value={filters.apartmentType}
        onChange={(e) => setFilters({ ...filters, apartmentType: e.target.value })}
        data-testid="filter-apartment-type"
      >
        <option value="">All Types</option>
        <option value="WG room">WG Room</option>
        <option value="studio">Studio</option>
        <option value="1 Zimmer">1 Zimmer</option>
        <option value="2 Zimmer">2 Zimmer</option>
        <option value="3+ Zimmer">3+ Zimmer</option>
      </select>
      
      <button 
        className="clear-btn"
        onClick={() => setFilters({
          listingType: '',
          neighborhood: '',
          apartmentType: '',
          searchQuery: ''
        })}
        data-testid="clear-filters-btn"
      >
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
  const [selectedListing, setSelectedListing] = useState(null);
  const [mapCenter, setMapCenter] = useState(BERLIN_CENTER);
  const [filters, setFilters] = useState({
    listingType: '',
    neighborhood: '',
    apartmentType: '',
    searchQuery: ''
  });
  
  // Fetch data
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
  
  // Fetch listings with filters
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
        data = data.filter(l => 
          l.neighborhood.toLowerCase().includes(query) ||
          l.apartment_type.toLowerCase().includes(query) ||
          (l.description && l.description.toLowerCase().includes(query))
        );
      }
      
      setListings(data);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    }
  }, [filters]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    if (!isLoading) {
      fetchListings();
    }
  }, [filters, isLoading, fetchListings]);
  
  // Handle map click for pin placement
  const handleMapClick = (latlng) => {
    // Find nearest neighborhood
    let nearest = "Mitte";
    let minDist = Infinity;
    for (const n of neighborhoods) {
      const dist = Math.sqrt(Math.pow(latlng.lat - n.lat, 2) + Math.pow(latlng.lng - n.lng, 2));
      if (dist < minDist) {
        minDist = dist;
        nearest = n.name;
      }
    }
    
    setPinLocation({ lat: latlng.lat, lng: latlng.lng, neighborhood: nearest });
    setShowCreateModal(true);
    setIsPlacingPin(false);
  };
  
  // Handle create listing
  const handleCreateListing = async (data) => {
    const response = await axios.post(`${API}/listings`, data);
    setListings(prev => [response.data, ...prev]);
    setPinLocation(null);
  };
  
  // Filtered listings
  const filteredListings = listings;
  
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
            <p className="text-xs text-gray-500 -mt-0.5">Marketplace • MongoDB</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isPlacingPin ? (
            <button 
              className="btn btn-secondary"
              onClick={() => setIsPlacingPin(false)}
              data-testid="cancel-pin-btn"
            >
              <X size={18} /> Cancel
            </button>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={() => {
                setIsPlacingPin(true);
                toast.info("Click on the map to place your listing! 📍");
              }}
              data-testid="add-listing-btn"
            >
              <Plus size={18} /> Pin & List
            </button>
          )}
        </div>
      </header>
      
      {/* Pin Instruction Banner */}
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
          <MapContainer
            center={BERLIN_CENTER}
            zoom={BERLIN_ZOOM}
            style={{ height: '100%', width: '100%', cursor: isPlacingPin ? 'crosshair' : 'grab' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <MapUpdater center={mapCenter} zoom={filters.neighborhood ? 14 : BERLIN_ZOOM} />
            <MapClickHandler onMapClick={handleMapClick} isPlacingPin={isPlacingPin} />
            
            {/* Pin preview */}
            {pinLocation && !showCreateModal && (
              <Marker position={[pinLocation.lat, pinLocation.lng]} icon={createPinIcon()} />
            )}
            
            {/* Listing markers */}
            {filteredListings.map(listing => (
              <Marker
                key={listing.id}
                position={[listing.lat, listing.lng]}
                icon={listing.listing_type === 'offering' ? createOfferingIcon() : createLookingIcon()}
                eventHandlers={{
                  click: () => setSelectedListing(listing),
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[180px]">
                    <div className="font-bold">{listing.neighborhood}</div>
                    <div className="text-sm text-gray-600">{listing.apartment_type}</div>
                    {listing.rent_amount && (
                      <div className="text-lg font-semibold mt-1">€{listing.rent_amount}</div>
                    )}
                    <button 
                      className="mt-2 text-xs text-orange-500 font-medium"
                      onClick={() => setSelectedListing(listing)}
                    >
                      View Details →
                    </button>
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
        </div>
        
        {/* Listings Section */}
        <div className="listings-section" data-testid="listings-section">
          <FilterBar filters={filters} setFilters={setFilters} neighborhoods={neighborhoods} />
          <Stats listings={filteredListings} />
          
          {isLoading ? (
            <div className="empty-state">
              <div className="spinner"></div>
              <p className="mt-4 text-sm font-medium">Loading listings...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="empty-state" data-testid="empty-state">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Users size={32} className="text-gray-400" />
              </div>
              <p className="font-semibold text-gray-700">No listings yet</p>
              <p className="text-sm text-gray-500 mt-1">Be the first to pin your listing!</p>
              <button 
                className="btn btn-primary mt-4"
                onClick={() => setIsPlacingPin(true)}
              >
                <Plus size={18} /> Pin & List
              </button>
            </div>
          ) : (
            <div data-testid="listings-grid" className="pb-24 lg:pb-4">
              {filteredListings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onView={setSelectedListing}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Mobile bottom action bar */}
      <div className="mobile-action-bar lg:hidden">
        {isPlacingPin ? (
          <button 
            className="btn btn-secondary flex-1"
            onClick={() => setIsPlacingPin(false)}
          >
            <X size={18} /> Cancel
          </button>
        ) : (
          <button 
            className="btn btn-primary flex-1"
            onClick={() => {
              setIsPlacingPin(true);
              toast.info("Tap on the map to place your listing! 📍");
            }}
            data-testid="mobile-add-btn"
          >
            <Plus size={18} /> Pin & List
          </button>
        )}
      </div>
      
      {/* Modals */}
      <CreateListingModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setPinLocation(null);
        }}
        pinLocation={pinLocation}
        neighborhoods={neighborhoods}
        onSubmit={handleCreateListing}
      />
      
      <ViewListingModal
        listing={selectedListing}
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
      />
    </div>
  );
}

export default App;
