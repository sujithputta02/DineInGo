import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, MapPin, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/Header';

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
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events`);
      
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">Upcoming Events</h1>
        
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No events available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const spotsLeft = event.capacity - (event.registeredCount || 0);
              
              return (
                <div
                  key={event._id}
                  onClick={() => handleEventClick(event._id)}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl"
                >
                  {/* Event Image */}
                  <div className="h-48 bg-gradient-to-r from-emerald-500 to-emerald-600 relative">
                    {event.imageUrl && (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-semibold text-emerald-600">
                      {event.category}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3 text-gray-800">{event.title}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={16} className="text-emerald-500" />
                        <span className="text-sm">
                          {event.startDate && event.endDate ? (
                            (() => {
                              const start = new Date(event.startDate);
                              const end = new Date(event.endDate);
                              const isSameDay = start.toDateString() === end.toDateString();
                              
                              if (isSameDay) {
                                return start.toLocaleDateString();
                              } else {
                                const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${daysDiff} days)`;
                              }
                            })()
                          ) : (
                            new Date(event.date).toLocaleDateString()
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock size={16} className="text-emerald-500" />
                        <span className="text-sm">{event.time}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={16} className="text-emerald-500" />
                        <span className="text-sm">{event.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users size={16} className="text-emerald-500" />
                        <span className="text-sm">{spotsLeft} spots left</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div>
                        <span className="text-2xl font-bold text-emerald-600">₹{event.price}</span>
                        <span className="text-sm text-gray-500 ml-1">per person</span>
                      </div>
                      <button className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition-colors">
                        Register
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
