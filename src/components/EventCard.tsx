import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Event as AppEvent } from '../types';

interface EventCardProps {
    event: AppEvent;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
    const navigate = useNavigate();
    const spotsLeft = event.capacity - event.registeredCount;

    return (
        <div
            onClick={() => navigate(`/event/${event._id || event.id}/register`)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-all hover:border-emerald-200 group"
        >
            {/* Event Image */}
            <div className="h-40 bg-gray-100 relative overflow-hidden">
                {event.imageUrl ? (
                    <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-200">
                        <Calendar size={48} />
                    </div>
                )}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-emerald-700 shadow-sm">
                    {event.category}
                </div>
            </div>

            {/* Event Details */}
            <div className="p-4">
                <h3 className="text-lg font-bold mb-2 text-gray-800 line-clamp-1">{event.title}</h3>

                <div className="space-y-1.5 mb-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-emerald-500" />
                        <span>{new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-emerald-500" />
                        <span>{event.time}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-emerald-500" />
                        <span className="truncate">{event.location}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Users size={14} className="text-emerald-500" />
                        <span>{spotsLeft > 0 ? `${spotsLeft} spots left` : 'Sold Out'}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div>
                        <span className="text-lg font-bold text-emerald-600">₹{event.price}</span>
                        <span className="text-xs text-gray-400 ml-1">/person</span>
                    </div>
                    <span className="text-sm font-medium text-emerald-600 group-hover:underline">
                        Register →
                    </span>
                </div>
            </div>
        </div>
    );
};

export default EventCard;
