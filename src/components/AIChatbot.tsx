import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Trash2, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatbotProps {
  userContext?: {
    userName?: string;
    email?: string;
    recentBookings?: string;
    currentPage?: string;
  };
}

const AIChatbot: React.FC<AIChatbotProps> = ({ userContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const auth = useAuth();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history when opened
  useEffect(() => {
    if (isOpen && auth.currentUser && messages.length === 0) {
      loadChatHistory();
    }
  }, [isOpen, auth.currentUser]);

  const loadChatHistory = async () => {
    if (!auth.currentUser) return;

    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${API_URL}/api/chatbot/history/${auth.currentUser.uid}`);
      const data = await response.json();

      if (data.success && data.history.length > 0) {
        setMessages(data.history.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp || Date.now())
        })));
      } else {
        // Show welcome message if no history
        setMessages([{
          role: 'assistant',
          content: "🦖 Rawr! Hello! I'm Dino, your friendly DineInGo assistant. I'm here to help you with:\n\n• 🍽️ Making restaurant reservations\n• 🎉 Booking events\n• 📍 Finding the perfect dining spot\n• 👤 Account management\n• ❓ Answering your questions\n• 💬 Handling feedback\n\nI know everything about DineInGo - from table bookings to event tickets, cancellation policies to digital wallet passes. How can I assist you today?",
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Show welcome message on error
      setMessages([{
        role: 'assistant',
        content: "🦖 Rawr! Hello! I'm Dino, your friendly DineInGo assistant. How can I help you today?",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !auth.currentUser) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          message: inputMessage,
          userContext: {
            ...userContext,
            userName: auth.currentUser.displayName || userContext?.userName,
            email: auth.currentUser.email || userContext?.email
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(data.timestamp)
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Add error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again or contact support@dineingo.com if the issue persists.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    if (!auth.currentUser) return;

    const confirmClear = window.confirm('Are you sure you want to clear the chat history?');
    if (!confirmClear) return;

    try {
      await fetch(`${API_URL}/api/chatbot/session/${auth.currentUser.uid}`, {
        method: 'DELETE'
      });

      setMessages([{
        role: 'assistant',
        content: "🦖 Chat history cleared! Ready for a fresh start. How can I help you today?",
        timestamp: new Date()
      }]);
      
      toast.success('Chat history cleared');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Failed to clear chat history');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!auth.currentUser) {
    return null; // Don't show chatbot if user is not logged in
  }

  return (
    <>
      {/* Chatbot Button - Dino Icon */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 group animate-bounce"
          aria-label="Open AI Assistant"
          style={{ animationDuration: '2s' }}
        >
          {/* Dino Icon Image */}
          <img 
            src="/images/Dino Icon.svg" 
            alt="Dino Assistant" 
            className="w-12 h-12 object-contain"
          />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            🦖 Chat with Dino - Ready to Help!
          </div>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center p-2">
                {/* Dino Icon */}
                <img 
                  src="/images/Dino Icon.svg" 
                  alt="Dino" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="font-semibold">🦖 Dino</h3>
                <p className="text-xs text-white/80">Your Dining Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-emerald-500 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-white/70' : 'text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin text-emerald-500" />
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-end gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent max-h-32"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-emerald-500 text-white p-3 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Powered by AI • Press Enter to send
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
