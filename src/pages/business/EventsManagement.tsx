import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { eventApi } from '../../services/api';
import { Plus, Edit2, Trash2, Calendar, MapPin, Users, DollarSign, Tag, Package, X, Save, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

interface TicketType {
    name: string;
    price: number;
    quantity: number;
    description: string;
    status: 'active' | 'sold_out' | 'hidden';
}

interface AddOn {
    name: string;
    price: number;
    description: string;
    isRequired: boolean;
    type: 'product' | 'service';
}

interface Event {
    _id?: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    capacity: number;
    price: number; // Base price or ignored if using tickets
    category: string;
    imageUrl: string;
    tickets: TicketType[];
    addOns: AddOn[];
}

const EventsManagement: React.FC = () => {
    const { currentUser } = useAuth();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null);

    // Default empty event state
    const emptyEvent: Event = {
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        capacity: 100,
        price: 0,
        category: 'General',
        imageUrl: '',
        tickets: [],
        addOns: []
    };

    const [formData, setFormData] = useState<Event>(emptyEvent);

    useEffect(() => {
        fetchEvents();
    }, [currentUser]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            // In a real app, we'd filter by business/owner ID, but for now getAll returns all
            // Assuming the backend filters or we filter client side
            const response = await eventApi.getAll();
            if (response.success) {
                setEvents(response.data);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setFormData(emptyEvent);
        setCurrentEvent(null);
        setIsEditing(true);
    };

    const handleEdit = (event: any) => {
        const formattedDate = new Date(event.date).toISOString().split('T')[0];
        setFormData({
            ...event,
            date: formattedDate,
            tickets: event.tickets || [],
            addOns: event.addOns || []
        });
        setCurrentEvent(event);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            try {
                await eventApi.delete(id);
                toast.success('Event deleted successfully');
                fetchEvents();
            } catch (error) {
                toast.error('Failed to delete event');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (currentEvent && currentEvent._id) {
                await eventApi.update(currentEvent._id, formData);
                toast.success('Event updated successfully');
            } else {
                await eventApi.create(formData);
                toast.success('Event created successfully');
            }
            setIsEditing(false);
            fetchEvents();
        } catch (error) {
            console.error('Error saving event:', error);
            toast.error('Failed to save event');
        }
    };

    // Ticket Management
    const addTicket = () => {
        setFormData({
            ...formData,
            tickets: [...formData.tickets, { name: '', price: 0, quantity: 100, description: '', status: 'active' }]
        });
    };

    const removeTicket = (index: number) => {
        const newTickets = [...formData.tickets];
        newTickets.splice(index, 1);
        setFormData({ ...formData, tickets: newTickets });
    };

    const updateTicket = (index: number, field: string, value: any) => {
        const newTickets = [...formData.tickets];
        newTickets[index] = { ...newTickets[index], [field]: value };
        setFormData({ ...formData, tickets: newTickets });
    };

    // Add-on Management
    const addAddOn = () => {
        setFormData({
            ...formData,
            addOns: [...formData.addOns, { name: '', price: 0, description: '', isRequired: false, type: 'product' }]
        });
    };

    const removeAddOn = (index: number) => {
        const newAddOns = [...formData.addOns];
        newAddOns.splice(index, 1);
        setFormData({ ...formData, addOns: newAddOns });
    };

    const updateAddOn = (index: number, field: string, value: any) => {
        const newAddOns = [...formData.addOns];
        newAddOns[index] = { ...newAddOns[index], [field]: value };
        setFormData({ ...formData, addOns: newAddOns });
    };

    if (loading) return <div className="p-8 text-center">Loading events...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Event Management</h1>
                    <p className="text-gray-600">Manage your events, tickets, and add-on services</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={handleOpenCreate}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
                    >
                        <Plus size={20} /> Create Event
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-2xl font-bold">{currentEvent ? 'Edit Event' : 'Create New Event'}</h2>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Info */}
                        <section className="space-y-4">
                            <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                                <Calendar className="text-indigo-600" size={20} /> Basic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="General">General</option>
                                        <option value="Music">Music</option>
                                        <option value="Dining">Dining</option>
                                        <option value="Workshop">Workshop</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                    <input
                                        type="url"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Tickets */}
                        <section className="space-y-4 pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                                    <Tag className="text-indigo-600" size={20} /> Ticket Types
                                </h3>
                                <button
                                    type="button"
                                    onClick={addTicket}
                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                                >
                                    <Plus size={16} /> Add Ticket Type
                                </button>
                            </div>

                            {formData.tickets.length === 0 && (
                                <p className="text-gray-500 italic text-sm">No ticket types defined. Default admission will apply if empty.</p>
                            )}

                            {formData.tickets.map((ticket, index) => (
                                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative group">
                                    <button
                                        type="button"
                                        onClick={() => removeTicket(index)}
                                        className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition hover:text-red-700"
                                    >
                                        <X size={18} />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase">Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. VIP Admission"
                                                className="w-full p-2 border rounded bg-white"
                                                value={ticket.name}
                                                onChange={(e) => updateTicket(index, 'name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase">Price</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full p-2 border rounded bg-white"
                                                value={ticket.price}
                                                onChange={(e) => updateTicket(index, 'price', parseFloat(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase">Qty Available</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full p-2 border rounded bg-white"
                                                value={ticket.quantity}
                                                onChange={(e) => updateTicket(index, 'quantity', parseInt(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase">Description</label>
                                            <input
                                                type="text"
                                                placeholder="Brief description of perks"
                                                className="w-full p-2 border rounded bg-white"
                                                value={ticket.description}
                                                onChange={(e) => updateTicket(index, 'description', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </section>

                        {/* Add-ons */}
                        <section className="space-y-4 pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                                    <Package className="text-indigo-600" size={20} /> Add-on Services
                                </h3>
                                <button
                                    type="button"
                                    onClick={addAddOn}
                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                                >
                                    <Plus size={16} /> Add Service
                                </button>
                            </div>

                            {formData.addOns.length === 0 && (
                                <p className="text-gray-500 italic text-sm">No add-on services configured.</p>
                            )}

                            {formData.addOns.map((addon, index) => (
                                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative group">
                                    <button
                                        type="button"
                                        onClick={() => removeAddOn(index)}
                                        className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition hover:text-red-700"
                                    >
                                        <X size={18} />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase">Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. VIP Parking"
                                                className="w-full p-2 border rounded bg-white"
                                                value={addon.name}
                                                onChange={(e) => updateAddOn(index, 'name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase">Price</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full p-2 border rounded bg-white"
                                                value={addon.price}
                                                onChange={(e) => updateAddOn(index, 'price', parseFloat(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase">Type</label>
                                            <select
                                                className="w-full p-2 border rounded bg-white"
                                                value={addon.type}
                                                onChange={(e) => updateAddOn(index, 'type', e.target.value)}
                                            >
                                                <option value="product">Product</option>
                                                <option value="service">Service</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-4 flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`req-${index}`}
                                                checked={addon.isRequired}
                                                onChange={(e) => updateAddOn(index, 'isRequired', e.target.checked)}
                                                className="rounded text-indigo-600"
                                            />
                                            <label htmlFor={`req-${index}`} className="text-sm text-gray-700">Required Selection (User must choose yes/no)</label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </section>

                        <div className="flex justify-end gap-3 pt-6 border-t">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                            >
                                <Save size={18} /> Save Event
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => (
                        <div key={event._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
                            <div className="h-48 bg-gray-200 relative">
                                {event.imageUrl ? (
                                    <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <Calendar size={48} />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold text-indigo-600">
                                    {event.category}
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                                <div className="space-y-2 text-gray-600 text-sm mb-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} />
                                        <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} />
                                        <span>{event.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Tag size={16} />
                                        <span>{event.tickets?.length || 0} Ticket Types</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t">
                                    <div className="text-sm">
                                        <span className="text-gray-500">Registered: </span>
                                        <span className="font-semibold">{event.registeredCount || 0}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(event)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Edit Event"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(event._id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Delete Event"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {events.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                            <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No events found</p>
                            <button
                                onClick={handleOpenCreate}
                                className="mt-4 text-indigo-600 hover:underline font-medium"
                            >
                                Create your first event
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EventsManagement;
