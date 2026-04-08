#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class BerlinMarketplaceAPITester:
    def __init__(self, base_url="https://wohnungsmarkt.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, {}

        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_neighborhoods_endpoint(self):
        """Test neighborhoods endpoint"""
        success, data = self.run_test("Get Neighborhoods", "GET", "neighborhoods", 200)
        if success and isinstance(data, list):
            if len(data) == 15:  # Should have 15 Berlin neighborhoods
                self.log_test("Neighborhoods Count", True)
            else:
                self.log_test("Neighborhoods Count", False, f"Expected 15, got {len(data)}")
            
            # Check structure
            if data and all('name' in n and 'lat' in n and 'lng' in n for n in data):
                self.log_test("Neighborhoods Structure", True)
            else:
                self.log_test("Neighborhoods Structure", False, "Missing required fields")
        return success, data

    def test_seed_endpoint(self):
        """Test seed endpoint"""
        return self.run_test("Seed Data", "POST", "seed", 200)

    def test_listings_endpoint(self):
        """Test listings endpoint"""
        success, data = self.run_test("Get All Listings", "GET", "listings", 200)
        if success and isinstance(data, list):
            if len(data) >= 10:  # Should have around 13 seeded listings
                self.log_test("Listings Count", True, f"Found {len(data)} listings")
            else:
                self.log_test("Listings Count", False, f"Expected ~13, got {len(data)}")
            
            # Check structure of first listing
            if data:
                listing = data[0]
                required_fields = ['id', 'listing_type', 'neighborhood', 'apartment_type', 
                                 'rent_type', 'lat', 'lng', 'created_at']
                if all(field in listing for field in required_fields):
                    self.log_test("Listing Structure", True)
                else:
                    missing = [f for f in required_fields if f not in listing]
                    self.log_test("Listing Structure", False, f"Missing fields: {missing}")
                
                # Check listing types
                if listing['listing_type'] in ['offering', 'looking']:
                    self.log_test("Listing Type Valid", True)
                else:
                    self.log_test("Listing Type Valid", False, f"Invalid type: {listing['listing_type']}")
        return success, data

    def test_listings_filters(self):
        """Test listing filtering"""
        # Test listing type filter
        success, data = self.run_test("Filter by Listing Type (offering)", "GET", "listings", 200, 
                                    params={"listing_type": "offering"})
        if success and data:
            if all(r['listing_type'] == 'offering' for r in data):
                self.log_test("Offering Filter Works", True)
            else:
                self.log_test("Offering Filter Works", False, "Wrong listing type in results")

        # Test looking filter
        success, data = self.run_test("Filter by Listing Type (looking)", "GET", "listings", 200, 
                                    params={"listing_type": "looking"})
        if success and data:
            if all(r['listing_type'] == 'looking' for r in data):
                self.log_test("Looking Filter Works", True)
            else:
                self.log_test("Looking Filter Works", False, "Wrong listing type in results")

        # Test neighborhood filter
        success, data = self.run_test("Filter by Neighborhood", "GET", "listings", 200, 
                                    params={"neighborhood": "Kreuzberg"})
        if success and data:
            if all(r['neighborhood'] == 'Kreuzberg' for r in data):
                self.log_test("Neighborhood Filter Works", True)
            else:
                self.log_test("Neighborhood Filter Works", False, "Wrong neighborhood in results")

        # Test apartment type filter
        success, data = self.run_test("Filter by Apartment Type", "GET", "listings", 200,
                                    params={"apartment_type": "1 Zimmer"})
        if success and data:
            if all(r['apartment_type'] == '1 Zimmer' for r in data):
                self.log_test("Apartment Type Filter Works", True)
            else:
                self.log_test("Apartment Type Filter Works", False, "Wrong apartment type in results")

        # Test rent type filter
        success, data = self.run_test("Filter by Rent Type", "GET", "listings", 200,
                                    params={"rent_type": "warmmiete"})
        if success and data:
            if all(r['rent_type'] == 'warmmiete' for r in data):
                self.log_test("Rent Type Filter Works", True)
            else:
                self.log_test("Rent Type Filter Works", False, "Wrong rent type in results")

    def test_create_offering_listing(self):
        """Test creating a new offering listing"""
        listing_data = {
            "listing_type": "offering",
            "lat": 52.4993,
            "lng": 13.4035,
            "neighborhood": "Kreuzberg",
            "rent_amount": 850.0,
            "apartment_size": 45.0,
            "apartment_type": "1 Zimmer",
            "rent_type": "warmmiete",
            "furnished": False,
            "building_type": "altbau",
            "description": "Test offering listing",
            "contact_email": "test@example.com"
        }
        
        success, data = self.run_test("Create Offering Listing", "POST", "listings", 200, data=listing_data)
        if success and isinstance(data, dict):
            if 'id' in data and data['listing_type'] == 'offering':
                self.log_test("Offering Creation Structure", True)
                return data['id']  # Return ID for further tests
            else:
                self.log_test("Offering Creation Structure", False, "Missing ID or wrong data")
        return None

    def test_create_looking_listing(self):
        """Test creating a new looking listing"""
        listing_data = {
            "listing_type": "looking",
            "lat": 52.4811,
            "lng": 13.4353,
            "neighborhood": "Neukölln",
            "apartment_size": 40.0,
            "apartment_type": "1 Zimmer",
            "rent_type": "warmmiete",
            "furnished": False,
            "description": "Test looking listing",
            "contact_email": "looking@example.com"
        }
        
        success, data = self.run_test("Create Looking Listing", "POST", "listings", 200, data=listing_data)
        if success and isinstance(data, dict):
            if 'id' in data and data['listing_type'] == 'looking':
                self.log_test("Looking Creation Structure", True)
                return data['id']  # Return ID for further tests
            else:
                self.log_test("Looking Creation Structure", False, "Missing ID or wrong data")
        return None

    def test_get_single_listing(self, listing_id):
        """Test getting a single listing by ID"""
        if not listing_id:
            self.log_test("Get Single Listing Skipped", False, "No listing ID available")
            return
        
        success, data = self.run_test("Get Single Listing", "GET", f"listings/{listing_id}", 200)
        if success and isinstance(data, dict):
            if data.get('id') == listing_id:
                self.log_test("Single Listing ID Match", True)
            else:
                self.log_test("Single Listing ID Match", False, "ID mismatch")

    def test_ai_generate_description(self):
        """Test AI description generation"""
        desc_data = {
            "listing_type": "offering",
            "neighborhood": "Kreuzberg",
            "apartment_type": "1 Zimmer",
            "apartment_size": 45.0,
            "rent_amount": 850.0,
            "rent_type": "warmmiete",
            "furnished": False,
            "building_type": "altbau"
        }
        
        success, data = self.run_test("AI Generate Description", "POST", "ai/generate-description", 200, data=desc_data)
        if success and isinstance(data, dict):
            if 'description' in data and data['description']:
                self.log_test("AI Description Generated", True, f"Generated: {data['description'][:50]}...")
            else:
                self.log_test("AI Description Generated", False, "No description in response")

    def test_ai_suggest_price(self):
        """Test AI price suggestion"""
        price_data = {
            "neighborhood": "Kreuzberg",
            "apartment_type": "1 Zimmer",
            "apartment_size": 45.0,
            "rent_type": "warmmiete",
            "furnished": False,
            "building_type": "altbau"
        }
        
        success, data = self.run_test("AI Suggest Price", "POST", "ai/suggest-price", 200, data=price_data)
        if success and isinstance(data, dict):
            if 'suggested_price' in data and isinstance(data['suggested_price'], (int, float)):
                self.log_test("AI Price Suggested", True, f"Suggested: €{data['suggested_price']}")
            else:
                self.log_test("AI Price Suggested", False, "No valid price in response")

    def test_neighborhood_stats(self):
        """Test neighborhood stats endpoint"""
        success, data = self.run_test("Get Neighborhood Stats", "GET", "stats/neighborhoods", 200)
        if success and isinstance(data, list):
            if data:
                stat = data[0]
                required_fields = ['neighborhood', 'avg_price_per_sqm', 'listing_count', 'lat', 'lng']
                if all(field in stat for field in required_fields):
                    self.log_test("Neighborhood Stats Structure", True)
                else:
                    missing = [f for f in required_fields if f not in stat]
                    self.log_test("Neighborhood Stats Structure", False, f"Missing fields: {missing}")

    def test_delete_listing(self, listing_id):
        """Test deleting a listing"""
        if not listing_id:
            self.log_test("Delete Listing Skipped", False, "No listing ID available")
            return
        
        success, data = self.run_test("Delete Listing", "DELETE", f"listings/{listing_id}", 200)
        if success:
            self.log_test("Listing Deleted Successfully", True)

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🧪 Testing Berlin Marketplace API at {self.base_url}")
        print("=" * 60)
        
        # Test basic endpoints
        self.test_root_endpoint()
        self.test_neighborhoods_endpoint()
        self.test_seed_endpoint()
        
        # Test listings
        self.test_listings_endpoint()
        self.test_listings_filters()
        
        # Test listing creation
        offering_id = self.test_create_offering_listing()
        looking_id = self.test_create_looking_listing()
        
        # Test single listing retrieval
        self.test_get_single_listing(offering_id)
        
        # Test AI features
        self.test_ai_generate_description()
        self.test_ai_suggest_price()
        
        # Test stats
        self.test_neighborhood_stats()
        
        # Test deletion (cleanup)
        if offering_id:
            self.test_delete_listing(offering_id)
        if looking_id:
            self.test_delete_listing(looking_id)
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            return 1

def main():
    tester = BerlinMarketplaceAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())