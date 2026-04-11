"""
Berlin.rent API Tests
Tests for 3 listing types: offering, looking, sharing_rent
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAPIHealth:
    """Basic API health and connectivity tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: API root returns: {data['message']}")

    def test_neighborhoods_endpoint(self):
        """Test neighborhoods endpoint returns Berlin neighborhoods"""
        response = requests.get(f"{BASE_URL}/api/neighborhoods")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        # Check structure
        assert "name" in data[0]
        assert "lat" in data[0]
        assert "lng" in data[0]
        print(f"SUCCESS: Found {len(data)} neighborhoods")


class TestListingsEndpoints:
    """Tests for listings CRUD operations"""
    
    def test_get_all_listings(self):
        """Test GET /api/listings returns all 3 listing types"""
        response = requests.get(f"{BASE_URL}/api/listings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Count by type
        offering_count = len([l for l in data if l.get('listing_type') == 'offering'])
        looking_count = len([l for l in data if l.get('listing_type') == 'looking'])
        sharing_count = len([l for l in data if l.get('listing_type') == 'sharing_rent'])
        
        print(f"SUCCESS: Found {len(data)} listings - Offering: {offering_count}, Looking: {looking_count}, Sharing: {sharing_count}")
        
        # Verify all 3 types exist
        assert offering_count > 0, "Should have offering listings"
        assert looking_count > 0, "Should have looking listings"
        assert sharing_count > 0, "Should have sharing_rent listings"
    
    def test_filter_by_offering_type(self):
        """Test filtering listings by offering type"""
        response = requests.get(f"{BASE_URL}/api/listings", params={"listing_type": "offering"})
        assert response.status_code == 200
        data = response.json()
        
        # All should be offering type
        for listing in data:
            assert listing['listing_type'] == 'offering', f"Expected offering, got {listing['listing_type']}"
        print(f"SUCCESS: Filtered {len(data)} offering listings")
    
    def test_filter_by_looking_type(self):
        """Test filtering listings by looking type"""
        response = requests.get(f"{BASE_URL}/api/listings", params={"listing_type": "looking"})
        assert response.status_code == 200
        data = response.json()
        
        for listing in data:
            assert listing['listing_type'] == 'looking', f"Expected looking, got {listing['listing_type']}"
        print(f"SUCCESS: Filtered {len(data)} looking listings")
    
    def test_filter_by_sharing_rent_type(self):
        """Test filtering listings by sharing_rent type"""
        response = requests.get(f"{BASE_URL}/api/listings", params={"listing_type": "sharing_rent"})
        assert response.status_code == 200
        data = response.json()
        
        for listing in data:
            assert listing['listing_type'] == 'sharing_rent', f"Expected sharing_rent, got {listing['listing_type']}"
        print(f"SUCCESS: Filtered {len(data)} sharing_rent listings")
    
    def test_filter_by_neighborhood(self):
        """Test filtering listings by neighborhood"""
        response = requests.get(f"{BASE_URL}/api/listings", params={"neighborhood": "Kreuzberg"})
        assert response.status_code == 200
        data = response.json()
        
        for listing in data:
            assert listing['neighborhood'] == 'Kreuzberg'
        print(f"SUCCESS: Filtered {len(data)} Kreuzberg listings")
    
    def test_filter_by_apartment_type(self):
        """Test filtering listings by apartment type"""
        response = requests.get(f"{BASE_URL}/api/listings", params={"apartment_type": "1 Zimmer"})
        assert response.status_code == 200
        data = response.json()
        
        for listing in data:
            assert listing['apartment_type'] == '1 Zimmer'
        print(f"SUCCESS: Filtered {len(data)} 1 Zimmer listings")


class TestCreateListings:
    """Tests for creating different listing types"""
    
    def test_create_offering_listing(self):
        """Test creating an offering listing (3-step wizard)"""
        payload = {
            "listing_type": "offering",
            "lat": 52.5200,
            "lng": 13.4050,
            "neighborhood": "Mitte",
            "rent_amount": 950,
            "apartment_size": 50,
            "apartment_type": "1 Zimmer",
            "rent_type": "warmmiete",
            "furnished": True,
            "building_type": "altbau",
            "description": "TEST_offering listing for testing",
            "contact_email": "test@example.com",
            "contact_phone": "+49 170 1234567"
        }
        
        response = requests.post(f"{BASE_URL}/api/listings", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data['listing_type'] == 'offering'
        assert data['rent_amount'] == 950
        assert data['apartment_size'] == 50
        assert data['contact_email'] == 'test@example.com'
        assert data['contact_phone'] == '+49 170 1234567'
        assert 'id' in data
        assert 'price_per_sqm' in data
        
        print(f"SUCCESS: Created offering listing with ID: {data['id']}")
        return data['id']
    
    def test_create_looking_listing(self):
        """Test creating a looking listing (3-step wizard)"""
        payload = {
            "listing_type": "looking",
            "lat": 52.4993,
            "lng": 13.4035,
            "neighborhood": "Kreuzberg",
            "apartment_size": 45,
            "apartment_type": "2 Zimmer",
            "rent_type": "warmmiete",
            "furnished": False,
            "description": "TEST_looking for apartment in Kreuzberg",
            "contact_email": "seeker@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/listings", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data['listing_type'] == 'looking'
        assert data['contact_email'] == 'seeker@example.com'
        assert 'id' in data
        
        print(f"SUCCESS: Created looking listing with ID: {data['id']}")
        return data['id']
    
    def test_create_sharing_rent_listing(self):
        """Test creating a sharing_rent listing (2-step wizard - no contact)"""
        payload = {
            "listing_type": "sharing_rent",
            "lat": 52.4811,
            "lng": 13.4353,
            "neighborhood": "Neukölln",
            "rent_amount": 720,
            "apartment_size": 42,
            "apartment_type": "1 Zimmer",
            "rent_type": "warmmiete",
            "furnished": False,
            "building_type": "altbau",
            "description": "TEST_sharing my rent data anonymously"
            # No contact_email or contact_phone for sharing_rent
        }
        
        response = requests.post(f"{BASE_URL}/api/listings", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data['listing_type'] == 'sharing_rent'
        assert data['rent_amount'] == 720
        # sharing_rent should not have contact info
        assert data.get('contact_email') is None
        assert data.get('contact_phone') is None
        assert 'id' in data
        assert 'price_per_sqm' in data
        
        print(f"SUCCESS: Created sharing_rent listing with ID: {data['id']}, price_per_sqm: {data['price_per_sqm']}")
        return data['id']
    
    def test_get_single_listing(self):
        """Test getting a single listing by ID"""
        # First get all listings
        response = requests.get(f"{BASE_URL}/api/listings")
        listings = response.json()
        
        if len(listings) > 0:
            listing_id = listings[0]['id']
            response = requests.get(f"{BASE_URL}/api/listings/{listing_id}")
            assert response.status_code == 200
            data = response.json()
            assert data['id'] == listing_id
            print(f"SUCCESS: Retrieved listing {listing_id}")
    
    def test_get_nonexistent_listing(self):
        """Test getting a non-existent listing returns 404"""
        response = requests.get(f"{BASE_URL}/api/listings/nonexistent-id-12345")
        assert response.status_code == 404
        print("SUCCESS: Non-existent listing returns 404")


class TestCommentsEndpoint:
    """Tests for comments functionality"""
    
    def test_add_comment_to_listing(self):
        """Test adding a comment to a listing"""
        # Get a listing first
        response = requests.get(f"{BASE_URL}/api/listings")
        listings = response.json()
        
        if len(listings) > 0:
            listing_id = listings[0]['id']
            
            comment_payload = {
                "text": "TEST_comment - Great listing!",
                "author_name": "Test User"
            }
            
            response = requests.post(f"{BASE_URL}/api/listings/{listing_id}/comments", json=comment_payload)
            assert response.status_code == 200
            data = response.json()
            
            assert data['success'] == True
            assert 'comment' in data
            assert data['comment']['text'] == "TEST_comment - Great listing!"
            assert data['comment']['author_name'] == "Test User"
            
            print(f"SUCCESS: Added comment to listing {listing_id}")
    
    def test_get_comments_for_listing(self):
        """Test getting comments for a listing"""
        response = requests.get(f"{BASE_URL}/api/listings")
        listings = response.json()
        
        if len(listings) > 0:
            listing_id = listings[0]['id']
            response = requests.get(f"{BASE_URL}/api/listings/{listing_id}/comments")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"SUCCESS: Retrieved {len(data)} comments for listing {listing_id}")


class TestStatsEndpoints:
    """Tests for statistics endpoints"""
    
    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert 'total_listings' in data
        assert 'avg_price_per_sqm' in data
        assert 'avg_by_neighborhood' in data
        assert 'avg_by_type' in data
        
        print(f"SUCCESS: Dashboard stats - Total: {data['total_listings']}, Avg €/m²: {data['avg_price_per_sqm']}")
    
    def test_neighborhood_stats(self):
        """Test neighborhood statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/stats/neighborhoods")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            assert 'neighborhood' in data[0]
            assert 'avg_price_per_sqm' in data[0]
            assert 'listing_count' in data[0]
        
        print(f"SUCCESS: Neighborhood stats for {len(data)} neighborhoods")


class TestListingStructure:
    """Tests for listing data structure validation"""
    
    def test_offering_listing_structure(self):
        """Verify offering listing has correct structure"""
        response = requests.get(f"{BASE_URL}/api/listings", params={"listing_type": "offering"})
        data = response.json()
        
        if len(data) > 0:
            listing = data[0]
            required_fields = ['id', 'listing_type', 'lat', 'lng', 'neighborhood', 
                             'apartment_type', 'rent_type', 'created_at']
            
            for field in required_fields:
                assert field in listing, f"Missing field: {field}"
            
            # Offering should have rent_amount
            assert listing.get('rent_amount') is not None or listing.get('rent_amount') == 0
            print("SUCCESS: Offering listing has correct structure")
    
    def test_looking_listing_structure(self):
        """Verify looking listing has correct structure"""
        response = requests.get(f"{BASE_URL}/api/listings", params={"listing_type": "looking"})
        data = response.json()
        
        if len(data) > 0:
            listing = data[0]
            required_fields = ['id', 'listing_type', 'lat', 'lng', 'neighborhood', 
                             'apartment_type', 'rent_type', 'created_at']
            
            for field in required_fields:
                assert field in listing, f"Missing field: {field}"
            
            print("SUCCESS: Looking listing has correct structure")
    
    def test_sharing_rent_listing_structure(self):
        """Verify sharing_rent listing has correct structure"""
        response = requests.get(f"{BASE_URL}/api/listings", params={"listing_type": "sharing_rent"})
        data = response.json()
        
        if len(data) > 0:
            listing = data[0]
            required_fields = ['id', 'listing_type', 'lat', 'lng', 'neighborhood', 
                             'apartment_type', 'rent_type', 'rent_amount', 'created_at']
            
            for field in required_fields:
                assert field in listing, f"Missing field: {field}"
            
            # sharing_rent should have rent_amount and price_per_sqm
            assert listing.get('rent_amount') is not None
            print("SUCCESS: Sharing_rent listing has correct structure")


class TestDeleteListing:
    """Tests for delete functionality"""
    
    def test_delete_listing(self):
        """Test deleting a listing"""
        # Create a test listing first
        payload = {
            "listing_type": "sharing_rent",
            "lat": 52.5200,
            "lng": 13.4050,
            "neighborhood": "Mitte",
            "rent_amount": 999,
            "apartment_size": 30,
            "apartment_type": "studio",
            "rent_type": "warmmiete",
            "description": "TEST_to_delete"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/listings", json=payload)
        assert create_response.status_code == 200
        listing_id = create_response.json()['id']
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/listings/{listing_id}")
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/api/listings/{listing_id}")
        assert get_response.status_code == 404
        
        print(f"SUCCESS: Deleted listing {listing_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
