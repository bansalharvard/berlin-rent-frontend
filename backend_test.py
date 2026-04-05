#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class BerlinRentAPITester:
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

    def test_rentals_endpoint(self):
        """Test rentals endpoint"""
        success, data = self.run_test("Get All Rentals", "GET", "rentals", 200)
        if success and isinstance(data, list):
            if len(data) >= 40:  # Should have around 49 seeded listings
                self.log_test("Rentals Count", True, f"Found {len(data)} listings")
            else:
                self.log_test("Rentals Count", False, f"Expected ~49, got {len(data)}")
            
            # Check structure of first rental
            if data:
                rental = data[0]
                required_fields = ['id', 'neighborhood', 'rent_amount', 'apartment_size', 
                                 'apartment_type', 'rent_type', 'price_per_sqm', 'lat', 'lng']
                if all(field in rental for field in required_fields):
                    self.log_test("Rental Structure", True)
                else:
                    missing = [f for f in required_fields if f not in rental]
                    self.log_test("Rental Structure", False, f"Missing fields: {missing}")
        return success, data

    def test_rentals_filters(self):
        """Test rental filtering"""
        # Test neighborhood filter
        success, data = self.run_test("Filter by Neighborhood", "GET", "rentals", 200, 
                                    params={"neighborhood": "Kreuzberg"})
        if success and data:
            if all(r['neighborhood'] == 'Kreuzberg' for r in data):
                self.log_test("Neighborhood Filter Works", True)
            else:
                self.log_test("Neighborhood Filter Works", False, "Wrong neighborhood in results")

        # Test apartment type filter
        success, data = self.run_test("Filter by Apartment Type", "GET", "rentals", 200,
                                    params={"apartment_type": "1 Zimmer"})
        if success and data:
            if all(r['apartment_type'] == '1 Zimmer' for r in data):
                self.log_test("Apartment Type Filter Works", True)
            else:
                self.log_test("Apartment Type Filter Works", False, "Wrong apartment type in results")

        # Test rent type filter
        success, data = self.run_test("Filter by Rent Type", "GET", "rentals", 200,
                                    params={"rent_type": "warmmiete"})
        if success and data:
            if all(r['rent_type'] == 'warmmiete' for r in data):
                self.log_test("Rent Type Filter Works", True)
            else:
                self.log_test("Rent Type Filter Works", False, "Wrong rent type in results")

        # Test price range filter
        success, data = self.run_test("Filter by Price Range", "GET", "rentals", 200,
                                    params={"min_rent": 500, "max_rent": 1000})
        if success and data:
            if all(500 <= r['rent_amount'] <= 1000 for r in data):
                self.log_test("Price Range Filter Works", True)
            else:
                self.log_test("Price Range Filter Works", False, "Price outside range in results")

    def test_create_rental(self):
        """Test creating a new rental"""
        rental_data = {
            "neighborhood": "Kreuzberg",
            "rent_amount": 850.0,
            "apartment_size": 45.0,
            "apartment_type": "1 Zimmer",
            "rent_type": "warmmiete",
            "furnished": False,
            "building_type": "altbau",
            "move_in_year": 2024
        }
        
        success, data = self.run_test("Create Rental", "POST", "rentals", 200, data=rental_data)
        if success and isinstance(data, dict):
            if 'id' in data and data['neighborhood'] == 'Kreuzberg':
                self.log_test("Rental Creation Structure", True)
                return data['id']  # Return ID for voting test
            else:
                self.log_test("Rental Creation Structure", False, "Missing ID or wrong data")
        return None

    def test_vote_rental(self, rental_id):
        """Test voting on a rental"""
        if not rental_id:
            self.log_test("Vote Test Skipped", False, "No rental ID available")
            return

        # Test upvote
        vote_data = {"vote_type": "upvote"}
        success, data = self.run_test("Upvote Rental", "POST", f"rentals/{rental_id}/vote", 200, data=vote_data)
        
        # Test downvote
        vote_data = {"vote_type": "downvote"}
        success, data = self.run_test("Downvote Rental", "POST", f"rentals/{rental_id}/vote", 200, data=vote_data)

    def test_check_overpaying(self):
        """Test overpaying check endpoint"""
        overpaying_data = {
            "neighborhood": "Kreuzberg",
            "rent_amount": 850.0,
            "apartment_size": 45.0,
            "apartment_type": "1 Zimmer",
            "rent_type": "warmmiete"
        }
        
        success, data = self.run_test("Check Overpaying", "POST", "check-overpaying", 200, data=overpaying_data)
        if success and isinstance(data, dict):
            required_fields = ['your_price_per_sqm', 'average_price_per_sqm', 'status', 'similar_listings_count']
            if all(field in data for field in required_fields):
                self.log_test("Overpaying Response Structure", True)
                if data['status'] in ['good_deal', 'fair', 'overpaying']:
                    self.log_test("Overpaying Status Valid", True)
                else:
                    self.log_test("Overpaying Status Valid", False, f"Invalid status: {data['status']}")
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_test("Overpaying Response Structure", False, f"Missing fields: {missing}")

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

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🧪 Testing Berlin.rent API at {self.base_url}")
        print("=" * 60)
        
        # Test basic endpoints
        self.test_root_endpoint()
        self.test_neighborhoods_endpoint()
        self.test_seed_endpoint()
        
        # Test rentals
        self.test_rentals_endpoint()
        self.test_rentals_filters()
        
        # Test rental creation and voting
        rental_id = self.test_create_rental()
        self.test_vote_rental(rental_id)
        
        # Test overpaying check
        self.test_check_overpaying()
        
        # Test stats
        self.test_neighborhood_stats()
        
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
    tester = BerlinRentAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())