import { useEffect, useState, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Plus, MagnifyingGlass, CaretUp, CaretDown, X, House, Buildings, Funnel, MapPin } from "@phosphor-icons/react";
import { Toaster, toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Berlin center coordinates
const BERLIN_CENTER = [52.52, 13.405];
const BERLIN_ZOOM = 12;

// Custom marker icon
const createMarkerIcon = (pricePerSqm, avgPrice) => {
  let color = "#FF3800"; // default vermilion
  if (avgPrice) {
    const ratio = pricePerSqm / avgPrice;
    if (ratio < 0.9) color = "#059669"; // good deal - green
    else if (ratio > 1.1) color = "#DC2626"; // expensive - red
  }
  
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="
      width: 14px; 
      height: 14px; 
      background-color: ${color}; 
      border: 2px solid #0A0A0A;
      transform: rotate(45deg);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

// Map updater component
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
};

// Listing Card Component
const ListingCard = ({ rental, onHover, onVote, isHighlighted }) => {
  const formatRentType = (type) => type === "warmmiete" ? "WARM" : "KALT";
  const formatApartmentType = (type) => type.toUpperCase();
  
  return (
    <div 
      className={`listing-card ${isHighlighted ? 'highlighted' : ''}`}
      onMouseEnter={() => onHover(rental.id)}
      onMouseLeave={() => onHover(null)}
      data-testid={`listing-card-${rental.id}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="badge mr-2" data-testid={`badge-type-${rental.id}`}>{formatApartmentType(rental.apartment_type)}</span>
          <span className="badge" data-testid={`badge-rent-type-${rental.id}`}>{formatRentType(rental.rent_type)}</span>
        </div>
        {rental.furnished && <span className="badge">MÖBLIERT</span>}
      </div>
      
      <div className="mb-3">
        <div className="price-large" data-testid={`price-${rental.id}`}>€{rental.rent_amount.toLocaleString()}</div>
        <div className="price-sqm" data-testid={`price-sqm-${rental.id}`}>€{rental.price_per_sqm}/m² · {rental.apartment_size}m²</div>
      </div>
      
      <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <MapPin size={14} weight="bold" />
        <span data-testid={`neighborhood-${rental.id}`}>{rental.neighborhood}</span>
        {rental.building_type && (
          <span className="badge ml-auto">{rental.building_type.toUpperCase()}</span>
        )}
      </div>
      
      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex gap-2">
          <button 
            className="vote-btn upvote" 
            onClick={(e) => { e.stopPropagation(); onVote(rental.id, 'upvote'); }}
            data-testid={`upvote-btn-${rental.id}`}
          >
            <CaretUp size={12} weight="bold" /> {rental.upvotes}
          </button>
          <button 
            className="vote-btn downvote"
            onClick={(e) => { e.stopPropagation(); onVote(rental.id, 'downvote'); }}
            data-testid={`downvote-btn-${rental.id}`}
          >
            <CaretDown size={12} weight="bold" /> {rental.downvotes}
          </button>
        </div>
        {rental.move_in_year && (
          <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono' }}>
            SINCE {rental.move_in_year}
          </span>
        )}
      </div>
    </div>
  );
};

// Filter Bar Component
const FilterBar = ({ filters, setFilters, neighborhoods, onSearch }) => {
  const apartmentTypes = ["WG room", "studio", "1 Zimmer", "2 Zimmer", "3+ Zimmer"];
  
  return (
    <div className="filter-bar" data-testid="filter-bar">
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <MagnifyingGlass size={18} style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder="Search neighborhood..."
          className="flex-1 py-2 px-3 border border-[var(--border)] bg-white font-mono text-sm"
          style={{ minWidth: '150px' }}
          value={filters.searchQuery}
          onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
          data-testid="search-input"
        />
      </div>
      
      <select
        className="py-2 px-3 border border-[var(--border)] bg-white font-mono text-sm"
        value={filters.neighborhood}
        onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })}
        data-testid="filter-neighborhood"
      >
        <option value="">All Neighborhoods</option>
        {neighborhoods.map(n => (
          <option key={n.name} value={n.name}>{n.name}</option>
        ))}
      </select>
      
      <select
        className="py-2 px-3 border border-[var(--border)] bg-white font-mono text-sm"
        value={filters.apartmentType}
        onChange={(e) => setFilters({ ...filters, apartmentType: e.target.value })}
        data-testid="filter-apartment-type"
      >
        <option value="">All Types</option>
        {apartmentTypes.map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      
      <div className="toggle-segment" data-testid="filter-rent-type">
        <button 
          className={filters.rentType === '' ? 'active' : ''}
          onClick={() => setFilters({ ...filters, rentType: '' })}
        >All</button>
        <button 
          className={filters.rentType === 'warmmiete' ? 'active' : ''}
          onClick={() => setFilters({ ...filters, rentType: 'warmmiete' })}
          data-testid="filter-warmmiete"
        >Warm</button>
        <button 
          className={filters.rentType === 'kaltmiete' ? 'active' : ''}
          onClick={() => setFilters({ ...filters, rentType: 'kaltmiete' })}
          data-testid="filter-kaltmiete"
        >Kalt</button>
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Min €"
          className="w-20 py-2 px-3 border border-[var(--border)] bg-white font-mono text-sm"
          value={filters.minRent}
          onChange={(e) => setFilters({ ...filters, minRent: e.target.value })}
          data-testid="filter-min-rent"
        />
        <span>-</span>
        <input
          type="number"
          placeholder="Max €"
          className="w-20 py-2 px-3 border border-[var(--border)] bg-white font-mono text-sm"
          value={filters.maxRent}
          onChange={(e) => setFilters({ ...filters, maxRent: e.target.value })}
          data-testid="filter-max-rent"
        />
      </div>
      
      <button 
        className="btn-secondary flex items-center gap-2"
        onClick={() => setFilters({
          neighborhood: '',
          apartmentType: '',
          rentType: '',
          minRent: '',
          maxRent: '',
          furnished: '',
          searchQuery: ''
        })}
        data-testid="clear-filters-btn"
      >
        <X size={14} /> Clear
      </button>
    </div>
  );
};

// Add Rental Form Modal
const AddRentalModal = ({ isOpen, onClose, neighborhoods, onSubmit }) => {
  const [formData, setFormData] = useState({
    neighborhood: '',
    rent_amount: '',
    apartment_size: '',
    apartment_type: 'WG room',
    rent_type: 'warmmiete',
    furnished: false,
    contract_type: '',
    move_in_year: '',
    building_type: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.neighborhood || !formData.rent_amount || !formData.apartment_size) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        rent_amount: parseFloat(formData.rent_amount),
        apartment_size: parseFloat(formData.apartment_size),
        move_in_year: formData.move_in_year ? parseInt(formData.move_in_year) : null
      });
      setFormData({
        neighborhood: '',
        rent_amount: '',
        apartment_size: '',
        apartment_type: 'WG room',
        rent_type: 'warmmiete',
        furnished: false,
        contract_type: '',
        move_in_year: '',
        building_type: ''
      });
      onClose();
      toast.success("Rental added successfully!");
    } catch (err) {
      toast.error("Failed to add rental. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="form-modal" onClick={onClose} data-testid="add-rental-modal">
      <div className="form-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="font-heading text-xl font-bold tracking-tight">ADD YOUR RENT</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100" data-testid="close-modal-btn">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-body">
            <div className="form-field">
              <label>Neighborhood *</label>
              <select
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                required
                data-testid="form-neighborhood"
              >
                <option value="">Select neighborhood...</option>
                {neighborhoods.map(n => (
                  <option key={n.name} value={n.name}>{n.name}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="form-field">
                <label>Rent Amount (€) *</label>
                <input
                  type="number"
                  value={formData.rent_amount}
                  onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                  placeholder="e.g., 850"
                  required
                  min="0"
                  data-testid="form-rent-amount"
                />
              </div>
              
              <div className="form-field">
                <label>Size (m²) *</label>
                <input
                  type="number"
                  value={formData.apartment_size}
                  onChange={(e) => setFormData({ ...formData, apartment_size: e.target.value })}
                  placeholder="e.g., 45"
                  required
                  min="1"
                  data-testid="form-apartment-size"
                />
              </div>
            </div>
            
            <div className="form-field">
              <label>Apartment Type *</label>
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
            
            <div className="form-field">
              <label>Rent Type *</label>
              <div className="toggle-segment w-full">
                <button 
                  type="button"
                  className={`flex-1 ${formData.rent_type === 'warmmiete' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, rent_type: 'warmmiete' })}
                  data-testid="form-warmmiete"
                >Warmmiete</button>
                <button 
                  type="button"
                  className={`flex-1 ${formData.rent_type === 'kaltmiete' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, rent_type: 'kaltmiete' })}
                  data-testid="form-kaltmiete"
                >Kaltmiete</button>
              </div>
            </div>
            
            <div className="form-field">
              <label>Building Type</label>
              <select
                value={formData.building_type}
                onChange={(e) => setFormData({ ...formData, building_type: e.target.value })}
                data-testid="form-building-type"
              >
                <option value="">Not specified</option>
                <option value="altbau">Altbau (Pre-1949)</option>
                <option value="neubau">Neubau (Post-1949)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="form-field">
                <label>Furnished</label>
                <div className="toggle-segment w-full">
                  <button 
                    type="button"
                    className={`flex-1 ${formData.furnished === false ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, furnished: false })}
                  >No</button>
                  <button 
                    type="button"
                    className={`flex-1 ${formData.furnished === true ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, furnished: true })}
                    data-testid="form-furnished"
                  >Yes</button>
                </div>
              </div>
              
              <div className="form-field">
                <label>Move-in Year</label>
                <input
                  type="number"
                  value={formData.move_in_year}
                  onChange={(e) => setFormData({ ...formData, move_in_year: e.target.value })}
                  placeholder="e.g., 2024"
                  min="2000"
                  max="2030"
                  data-testid="form-move-in-year"
                />
              </div>
            </div>
          </div>
          
          <div className="form-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSubmitting}
              data-testid="submit-rental-btn"
            >
              {isSubmitting ? 'Adding...' : 'Add Rental'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Am I Overpaying Modal
const OverpayingModal = ({ isOpen, onClose, neighborhoods }) => {
  const [formData, setFormData] = useState({
    neighborhood: '',
    rent_amount: '',
    apartment_size: '',
    apartment_type: '1 Zimmer',
    rent_type: 'warmmiete'
  });
  const [result, setResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  
  const handleCheck = async (e) => {
    e.preventDefault();
    if (!formData.neighborhood || !formData.rent_amount || !formData.apartment_size) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setIsChecking(true);
    try {
      const response = await axios.post(`${API}/check-overpaying`, {
        ...formData,
        rent_amount: parseFloat(formData.rent_amount),
        apartment_size: parseFloat(formData.apartment_size)
      });
      setResult(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error("Not enough data to compare. Try a different neighborhood.");
      } else {
        toast.error("Failed to check. Please try again.");
      }
    } finally {
      setIsChecking(false);
    }
  };
  
  const getStatusText = (status) => {
    switch (status) {
      case 'good_deal': return "GREAT DEAL!";
      case 'fair': return "FAIR PRICE";
      case 'overpaying': return "OVERPAYING";
      default: return status;
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'good_deal': return 'var(--success)';
      case 'fair': return 'var(--text-secondary)';
      case 'overpaying': return 'var(--accent-primary)';
      default: return 'var(--text-secondary)';
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="form-modal" onClick={onClose} data-testid="overpaying-modal">
      <div className="form-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="font-heading text-xl font-bold tracking-tight">AM I OVERPAYING?</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100" data-testid="close-overpaying-modal">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleCheck}>
          <div className="form-body">
            <div className="form-field">
              <label>Neighborhood</label>
              <select
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                required
                data-testid="overpaying-neighborhood"
              >
                <option value="">Select neighborhood...</option>
                {neighborhoods.map(n => (
                  <option key={n.name} value={n.name}>{n.name}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="form-field">
                <label>Your Rent (€)</label>
                <input
                  type="number"
                  value={formData.rent_amount}
                  onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                  placeholder="e.g., 850"
                  required
                  data-testid="overpaying-rent"
                />
              </div>
              
              <div className="form-field">
                <label>Size (m²)</label>
                <input
                  type="number"
                  value={formData.apartment_size}
                  onChange={(e) => setFormData({ ...formData, apartment_size: e.target.value })}
                  placeholder="e.g., 45"
                  required
                  data-testid="overpaying-size"
                />
              </div>
            </div>
            
            <div className="form-field">
              <label>Apartment Type</label>
              <select
                value={formData.apartment_type}
                onChange={(e) => setFormData({ ...formData, apartment_type: e.target.value })}
                data-testid="overpaying-type"
              >
                <option value="WG room">WG Room</option>
                <option value="studio">Studio</option>
                <option value="1 Zimmer">1 Zimmer</option>
                <option value="2 Zimmer">2 Zimmer</option>
                <option value="3+ Zimmer">3+ Zimmer</option>
              </select>
            </div>
            
            <div className="form-field">
              <label>Rent Type</label>
              <div className="toggle-segment w-full">
                <button 
                  type="button"
                  className={`flex-1 ${formData.rent_type === 'warmmiete' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, rent_type: 'warmmiete' })}
                >Warmmiete</button>
                <button 
                  type="button"
                  className={`flex-1 ${formData.rent_type === 'kaltmiete' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, rent_type: 'kaltmiete' })}
                >Kaltmiete</button>
              </div>
            </div>
            
            {result && (
              <div className={`overpaying-indicator ${result.status.replace('_', '-')}`} data-testid="overpaying-result">
                <div className="text-center mb-4">
                  <div 
                    className="font-heading text-2xl font-bold"
                    style={{ color: getStatusColor(result.status) }}
                  >
                    {getStatusText(result.status)}
                  </div>
                  <div className="font-mono text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {result.difference_percent > 0 ? '+' : ''}{result.difference_percent}% vs. average
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="font-mono text-lg font-medium">€{result.your_price_per_sqm}</div>
                    <div className="label-mono">YOUR €/M²</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-medium">€{result.average_price_per_sqm}</div>
                    <div className="label-mono">AVG €/M²</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-medium">{result.similar_listings_count}</div>
                    <div className="label-mono">COMPARED</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="form-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isChecking}
              data-testid="check-overpaying-btn"
            >
              {isChecking ? 'Checking...' : 'Check Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Stats Summary Component
const StatsSummary = ({ rentals, stats }) => {
  const totalListings = rentals.length;
  const avgPrice = rentals.length > 0 
    ? Math.round(rentals.reduce((sum, r) => sum + r.price_per_sqm, 0) / rentals.length) 
    : 0;
  const avgRent = rentals.length > 0
    ? Math.round(rentals.reduce((sum, r) => sum + r.rent_amount, 0) / rentals.length)
    : 0;
  
  return (
    <div className="stats-bar" data-testid="stats-summary">
      <div className="stat-item">
        <span className="stat-value">{totalListings}</span>
        <span className="stat-label">Listings</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">€{avgRent}</span>
        <span className="stat-label">Avg Rent</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">€{avgPrice}/m²</span>
        <span className="stat-label">Avg Price</span>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [rentals, setRentals] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [neighborhoodStats, setNeighborhoodStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOverpayingModal, setShowOverpayingModal] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [mapCenter, setMapCenter] = useState(BERLIN_CENTER);
  const [filters, setFilters] = useState({
    neighborhood: '',
    apartmentType: '',
    rentType: '',
    minRent: '',
    maxRent: '',
    furnished: '',
    searchQuery: ''
  });
  
  // Calculate average price for marker coloring
  const avgPrice = rentals.length > 0 
    ? rentals.reduce((sum, r) => sum + r.price_per_sqm, 0) / rentals.length 
    : 15;
  
  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Seed data first (will only seed if empty)
      await axios.post(`${API}/seed`);
      
      // Fetch all data in parallel
      const [rentalsRes, neighborhoodsRes, statsRes] = await Promise.all([
        axios.get(`${API}/rentals`, { params: buildQueryParams() }),
        axios.get(`${API}/neighborhoods`),
        axios.get(`${API}/stats/neighborhoods`)
      ]);
      
      setRentals(rentalsRes.data);
      setNeighborhoods(neighborhoodsRes.data);
      setNeighborhoodStats(statsRes.data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const buildQueryParams = () => {
    const params = {};
    if (filters.neighborhood) params.neighborhood = filters.neighborhood;
    if (filters.apartmentType) params.apartment_type = filters.apartmentType;
    if (filters.rentType) params.rent_type = filters.rentType;
    if (filters.minRent) params.min_rent = filters.minRent;
    if (filters.maxRent) params.max_rent = filters.maxRent;
    if (filters.furnished !== '') params.furnished = filters.furnished === 'true';
    return params;
  };
  
  // Fetch rentals when filters change
  const fetchRentals = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/rentals`, { params: buildQueryParams() });
      let data = response.data;
      
      // Apply search filter client-side
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        data = data.filter(r => r.neighborhood.toLowerCase().includes(query));
      }
      
      setRentals(data);
      
      // Update map center if filtering by neighborhood
      if (filters.neighborhood) {
        const hood = neighborhoods.find(n => n.name === filters.neighborhood);
        if (hood) {
          setMapCenter([hood.lat, hood.lng]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch rentals:", err);
    }
  }, [filters, neighborhoods]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    if (!isLoading) {
      fetchRentals();
    }
  }, [filters, isLoading, fetchRentals]);
  
  // Handle vote
  const handleVote = async (rentalId, voteType) => {
    try {
      await axios.post(`${API}/rentals/${rentalId}/vote`, { vote_type: voteType });
      setRentals(prev => prev.map(r => {
        if (r.id === rentalId) {
          return {
            ...r,
            upvotes: voteType === 'upvote' ? r.upvotes + 1 : r.upvotes,
            downvotes: voteType === 'downvote' ? r.downvotes + 1 : r.downvotes
          };
        }
        return r;
      }));
    } catch (err) {
      toast.error("Failed to vote");
    }
  };
  
  // Handle add rental
  const handleAddRental = async (data) => {
    const response = await axios.post(`${API}/rentals`, data);
    setRentals(prev => [response.data, ...prev]);
    // Refresh stats
    const statsRes = await axios.get(`${API}/stats/neighborhoods`);
    setNeighborhoodStats(statsRes.data);
  };
  
  // Filter rentals for display
  const filteredRentals = rentals;
  
  return (
    <div className="app-container" data-testid="app-container">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="app-header" data-testid="app-header">
        <div className="flex items-center gap-3">
          <House size={28} weight="bold" style={{ color: 'var(--accent-primary)' }} />
          <h1 className="font-heading text-2xl font-black tracking-tighter">berlin.rent</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            className="btn-secondary hidden sm:flex items-center gap-2"
            onClick={() => setShowOverpayingModal(true)}
            data-testid="overpaying-btn"
          >
            <Buildings size={16} weight="bold" />
            Am I Overpaying?
          </button>
          <button 
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowAddModal(true)}
            data-testid="add-rental-btn"
          >
            <Plus size={16} weight="bold" />
            Add Rent
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="main-content">
        {/* Map Section */}
        <div className="map-section" data-testid="map-section">
          <MapContainer
            center={BERLIN_CENTER}
            zoom={BERLIN_ZOOM}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MapUpdater center={mapCenter} zoom={filters.neighborhood ? 14 : BERLIN_ZOOM} />
            
            {filteredRentals.map(rental => (
              <Marker
                key={rental.id}
                position={[rental.lat, rental.lng]}
                icon={createMarkerIcon(rental.price_per_sqm, avgPrice)}
                eventHandlers={{
                  mouseover: () => setHighlightedId(rental.id),
                  mouseout: () => setHighlightedId(null),
                }}
              >
                <Popup>
                  <div className="map-popup">
                    <div className="popup-header">
                      <div className="font-bold">{rental.neighborhood}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {rental.apartment_type}
                      </div>
                    </div>
                    <div className="popup-body">
                      <div className="price-large">€{rental.rent_amount}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        €{rental.price_per_sqm}/m² · {rental.apartment_size}m²
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="badge">{rental.rent_type === 'warmmiete' ? 'WARM' : 'KALT'}</span>
                        {rental.building_type && <span className="badge">{rental.building_type.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          {/* Heatmap Legend */}
          <div className="heatmap-legend" data-testid="heatmap-legend">
            <div className="font-bold mb-1">PRICE / M²</div>
            <div className="legend-gradient"></div>
            <div className="legend-labels">
              <span>LOW</span>
              <span>HIGH</span>
            </div>
          </div>
        </div>
        
        {/* Listings Section */}
        <div className="listings-section" data-testid="listings-section">
          {/* Filter Bar */}
          <FilterBar 
            filters={filters} 
            setFilters={setFilters} 
            neighborhoods={neighborhoods}
          />
          
          {/* Stats Summary */}
          <StatsSummary rentals={filteredRentals} stats={neighborhoodStats} />
          
          {/* Listings Grid */}
          {isLoading ? (
            <div className="empty-state">
              <div className="spinner"></div>
              <p className="mt-4 font-mono text-sm">Loading listings...</p>
            </div>
          ) : filteredRentals.length === 0 ? (
            <div className="empty-state" data-testid="empty-state">
              <MapPin size={48} style={{ color: 'var(--text-secondary)' }} />
              <p className="mt-4 font-mono text-sm">No listings found</p>
              <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                Try adjusting your filters or add the first listing!
              </p>
            </div>
          ) : (
            <div data-testid="listings-grid">
              {filteredRentals.map(rental => (
                <ListingCard
                  key={rental.id}
                  rental={rental}
                  onHover={setHighlightedId}
                  onVote={handleVote}
                  isHighlighted={highlightedId === rental.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Mobile bottom action bar */}
      <div className="fixed bottom-4 left-4 right-4 flex gap-2 lg:hidden z-50">
        <button 
          className="btn-secondary flex-1 flex items-center justify-center gap-2"
          onClick={() => setShowOverpayingModal(true)}
          data-testid="mobile-overpaying-btn"
        >
          <Buildings size={16} weight="bold" />
          Check Price
        </button>
        <button 
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          onClick={() => setShowAddModal(true)}
          data-testid="mobile-add-btn"
        >
          <Plus size={16} weight="bold" />
          Add Rent
        </button>
      </div>
      
      {/* Modals */}
      <AddRentalModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        neighborhoods={neighborhoods}
        onSubmit={handleAddRental}
      />
      
      <OverpayingModal
        isOpen={showOverpayingModal}
        onClose={() => setShowOverpayingModal(false)}
        neighborhoods={neighborhoods}
      />
    </div>
  );
}

export default App;
