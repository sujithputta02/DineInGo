import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, MapPin, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import { PremiumEventCard } from '../components/PremiumEventCard';

interface Event {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startDate?: string;
  endDate?: string;
  time: string;
  location: string;
  capacity: number;
  registeredCount: number;
  price: number;
  imageUrl?: string;
  category?: string;
  organizer?: string;
}

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("dineInGoDarkMode");
    return saved === "true" ? true : false;
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/events`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      const eventsData = (data.data || data) as Event[];
      
      // Debug: Check for duplicates
      console.log('Fetched events count:', eventsData.length);
      console.log('Event IDs:', eventsData.map((e) => ({ id: e._id, title: e.title })));
      
      // Check for duplicate IDs
      const ids = eventsData.map((e) => e._id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.error('DUPLICATE IDs FOUND!');
        console.error('Total events:', ids.length);
        console.error('Unique IDs:', uniqueIds.size);
        
        // Remove duplicates on frontend as fallback
        const uniqueEvents = Array.from(
          new Map(eventsData.map((e) => [e._id, e])).values()
        );
        console.log('After deduplication:', uniqueEvents.length);
        setEvents(uniqueEvents);
      } else {
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}/register`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Loader className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className={`text-4xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Upcoming Events</h1>
        
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-lg`}>No events available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, idx) => (
              <PremiumEventCard
                key={event._id}
                event={event as any}
                isDarkMode={isDarkMode}
                isFavorite={false} // Would need favorites state if we want to show it here
                onToggleFavorite={() => {}} 
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
