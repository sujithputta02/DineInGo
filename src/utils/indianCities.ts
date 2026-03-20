export interface IndianCity {
  city: string;
  state: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export const indianCities: IndianCity[] = [
  // Major Cities
  { city: 'Mumbai', state: 'Maharashtra', country: 'India', coordinates: { lat: 19.0760, lng: 72.8777 } },
  { city: 'Delhi', state: 'Delhi', country: 'India', coordinates: { lat: 28.7041, lng: 77.1025 } },
  { city: 'Bangalore', state: 'Karnataka', country: 'India', coordinates: { lat: 12.9716, lng: 77.5946 } },
  { city: 'Hyderabad', state: 'Telangana', country: 'India', coordinates: { lat: 17.3850, lng: 78.4867 } },
  { city: 'Chennai', state: 'Tamil Nadu', country: 'India', coordinates: { lat: 13.0827, lng: 80.2707 } },
  { city: 'Kolkata', state: 'West Bengal', country: 'India', coordinates: { lat: 22.5726, lng: 88.3639 } },
  { city: 'Pune', state: 'Maharashtra', country: 'India', coordinates: { lat: 18.5204, lng: 73.8567 } },
  { city: 'Ahmedabad', state: 'Gujarat', country: 'India', coordinates: { lat: 23.0225, lng: 72.5714 } },
  { city: 'Jaipur', state: 'Rajasthan', country: 'India', coordinates: { lat: 26.9124, lng: 75.7873 } },
  { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', coordinates: { lat: 26.8467, lng: 80.9462 } },
  
  // Additional Major Cities
  { city: 'Surat', state: 'Gujarat', country: 'India', coordinates: { lat: 21.1702, lng: 72.8311 } },
  { city: 'Kanpur', state: 'Uttar Pradesh', country: 'India', coordinates: { lat: 26.4499, lng: 80.3319 } },
  { city: 'Nagpur', state: 'Maharashtra', country: 'India', coordinates: { lat: 21.1458, lng: 79.0882 } },
  { city: 'Indore', state: 'Madhya Pradesh', country: 'India', coordinates: { lat: 22.7196, lng: 75.8577 } },
  { city: 'Thane', state: 'Maharashtra', country: 'India', coordinates: { lat: 19.2183, lng: 72.9781 } },
  { city: 'Bhopal', state: 'Madhya Pradesh', country: 'India', coordinates: { lat: 23.2599, lng: 77.4126 } },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India', coordinates: { lat: 17.6868, lng: 83.2185 } },
  { city: 'Patna', state: 'Bihar', country: 'India', coordinates: { lat: 25.5941, lng: 85.1376 } },
  { city: 'Vadodara', state: 'Gujarat', country: 'India', coordinates: { lat: 22.3072, lng: 73.1812 } },
  { city: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India', coordinates: { lat: 28.6692, lng: 77.4538 } },
  
  // Southern Cities
  { city: 'Coimbatore', state: 'Tamil Nadu', country: 'India', coordinates: { lat: 11.0168, lng: 76.9558 } },
  { city: 'Kochi', state: 'Kerala', country: 'India', coordinates: { lat: 9.9312, lng: 76.2673 } },
  { city: 'Mysore', state: 'Karnataka', country: 'India', coordinates: { lat: 12.2958, lng: 76.6394 } },
  { city: 'Mangalore', state: 'Karnataka', country: 'India', coordinates: { lat: 12.9141, lng: 74.8560 } },
  { city: 'Vijayawada', state: 'Andhra Pradesh', country: 'India', coordinates: { lat: 16.5062, lng: 80.6480 } },
  
  // Northern Cities
  { city: 'Chandigarh', state: 'Chandigarh', country: 'India', coordinates: { lat: 30.7333, lng: 76.7794 } },
  { city: 'Dehradun', state: 'Uttarakhand', country: 'India', coordinates: { lat: 30.3165, lng: 78.0322 } },
  { city: 'Amritsar', state: 'Punjab', country: 'India', coordinates: { lat: 31.6340, lng: 74.8723 } },
  { city: 'Jammu', state: 'Jammu and Kashmir', country: 'India', coordinates: { lat: 32.7266, lng: 74.8570 } },
  { city: 'Srinagar', state: 'Jammu and Kashmir', country: 'India', coordinates: { lat: 34.0837, lng: 74.7973 } },
  { city: 'Ludhiana', state: 'Punjab', country: 'India', coordinates: { lat: 30.9010, lng: 75.8573 } },
  { city: 'Agra', state: 'Uttar Pradesh', country: 'India', coordinates: { lat: 27.1767, lng: 78.0081 } },
  { city: 'Varanasi', state: 'Uttar Pradesh', country: 'India', coordinates: { lat: 25.3176, lng: 82.9739 } },
  { city: 'Shimla', state: 'Himachal Pradesh', country: 'India', coordinates: { lat: 31.1048, lng: 77.1734 } },

  // Western Cities
  { city: 'Rajkot', state: 'Gujarat', country: 'India', coordinates: { lat: 22.3039, lng: 70.8022 } },
  { city: 'Nashik', state: 'Maharashtra', country: 'India', coordinates: { lat: 19.9975, lng: 73.7898 } },
  { city: 'Aurangabad', state: 'Maharashtra', country: 'India', coordinates: { lat: 19.8762, lng: 75.3433 } },
  { city: 'Panaji', state: 'Goa', country: 'India', coordinates: { lat: 15.4909, lng: 73.8278 } },
  { city: 'Jodhpur', state: 'Rajasthan', country: 'India', coordinates: { lat: 26.2389, lng: 73.0243 } },
  { city: 'Udaipur', state: 'Rajasthan', country: 'India', coordinates: { lat: 24.5854, lng: 73.7125 } },

  // Eastern & Central Cities
  { city: 'Bhubaneswar', state: 'Odisha', country: 'India', coordinates: { lat: 20.2961, lng: 85.8245 } },
  { city: 'Raipur', state: 'Chhattisgarh', country: 'India', coordinates: { lat: 21.2514, lng: 81.6296 } },
  { city: 'Ranchi', state: 'Jharkhand', country: 'India', coordinates: { lat: 23.3441, lng: 85.3096 } },
  { city: 'Guwahati', state: 'Assam', country: 'India', coordinates: { lat: 26.1445, lng: 91.7362 } },
  { city: 'Gwalior', state: 'Madhya Pradesh', country: 'India', coordinates: { lat: 26.2124, lng: 78.1773 } },
  { city: 'Jabalpur', state: 'Madhya Pradesh', country: 'India', coordinates: { lat: 23.1815, lng: 79.9864 } },

  // More Southern Cities
  { city: 'Madurai', state: 'Tamil Nadu', country: 'India', coordinates: { lat: 9.9252, lng: 78.1198 } },
  { city: 'Tiruchirappalli', state: 'Tamil Nadu', country: 'India', coordinates: { lat: 10.7905, lng: 78.7047 } },
  { city: 'Salem', state: 'Tamil Nadu', country: 'India', coordinates: { lat: 11.6643, lng: 78.1460 } },
  { city: 'Warangal', state: 'Telangana', country: 'India', coordinates: { lat: 17.9689, lng: 79.5941 } },
  { city: 'Trivandrum', state: 'Kerala', country: 'India', coordinates: { lat: 8.5241, lng: 76.9366 } },
  { city: 'Calicut', state: 'Kerala', country: 'India', coordinates: { lat: 11.2588, lng: 75.7804 } },
  { city: 'Hubli', state: 'Karnataka', country: 'India', coordinates: { lat: 15.3647, lng: 75.1240 } },
  { city: 'Belgaum', state: 'Karnataka', country: 'India', coordinates: { lat: 15.8497, lng: 74.4977 } },
  { city: 'Nellore', state: 'Andhra Pradesh', country: 'India', coordinates: { lat: 14.4426, lng: 79.9865 } },
  { city: 'Kurnool', state: 'Andhra Pradesh', country: 'India', coordinates: { lat: 15.8281, lng: 78.0373 } }
]; 
