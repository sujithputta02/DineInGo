import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaChair, FaCheck, FaInfoCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'reserved' | 'selected';
  position: { x: number; y: number };
}

const SelectTable: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { date, time, guests } = location.state || {};
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    // Simulate loading tables from an API
    const loadTables = () => {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockTables: Table[] = [
        { id: '1', name: 'Table 1', capacity: 2, status: 'available', position: { x: 20, y: 20 } },
        { id: '2', name: 'Table 2', capacity: 4, status: 'available', position: { x: 120, y: 20 } },
        { id: '3', name: 'Table 3', capacity: 6, status: 'reserved', position: { x: 220, y: 20 } },
        { id: '4', name: 'Table 4', capacity: 4, status: 'available', position: { x: 20, y: 120 } },
        { id: '5', name: 'Table 5', capacity: 8, status: 'available', position: { x: 120, y: 120 } },
        { id: '6', name: 'Table 6', capacity: 2, status: 'available', position: { x: 220, y: 120 } },
      ];
      setTimeout(() => {
        setTables(mockTables);
        setLoading(false);
      }, 1000);
    };

    loadTables();
  }, []);

  const handleTableSelect = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (table && table.status === 'reserved') {
      toast.error('This table is already reserved. Please select another table.');
      return;
    }
    setSelectedTable(tableId);
    setTables(tables.map(t => ({
      ...t,
      status: t.id === tableId ? 'selected' : t.status
    })));
  };

  const handleProceed = () => {
    if (!selectedTable) {
      toast.error('Please select a table to proceed');
      return;
    }
    navigate('/reservation-preview', {
      state: {
        ...location.state,
        table: selectedTable
      }
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Select Your Table</h1>
          <div className="w-8" /> {/* Spacer for alignment */}
        </div>

        {/* Reservation Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-500">Date</p>
              <p className="font-semibold">{date || 'Not selected'}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Time</p>
              <p className="font-semibold">{time || 'Not selected'}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Guests</p>
              <p className="font-semibold">{guests || 'Not selected'}</p>
            </div>
          </div>
        </motion.div>

        {/* Instructions */}
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-r-lg"
          >
            <div className="flex items-start">
              <FaInfoCircle className="text-blue-500 mt-1 mr-3" />
              <div>
                <h3 className="font-semibold text-blue-800">How to select a table</h3>
                <p className="text-blue-700 mt-1">
                  Click on an available table to select it. Green tables are available, 
                  red tables are reserved, and blue tables are selected.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Table Selection Area */}
        <div className="relative bg-white rounded-lg shadow-lg p-8 min-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tables.map((table) => (
                <motion.div
                  key={table.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative p-6 rounded-lg cursor-pointer transition-all duration-200 ${
                    table.status === 'available'
                      ? 'bg-green-50 hover:bg-green-100 border-2 border-green-200'
                      : table.status === 'reserved'
                      ? 'bg-red-50 border-2 border-red-200 cursor-not-allowed'
                      : 'bg-blue-50 border-2 border-blue-200'
                  }`}
                  onClick={() => table.status !== 'reserved' && handleTableSelect(table.id)}
                >
                  <div className="flex flex-col items-center">
                    <FaChair className={`text-4xl mb-4 ${
                      table.status === 'available'
                        ? 'text-green-500'
                        : table.status === 'reserved'
                        ? 'text-red-500'
                        : 'text-blue-500'
                    }`} />
                    <h3 className="font-semibold text-lg">{table.name}</h3>
                    <p className="text-gray-600">Capacity: {table.capacity} guests</p>
                    {table.status === 'selected' && (
                      <div className="absolute top-2 right-2">
                        <FaCheck className="text-blue-500" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleProceed}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
              selectedTable
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={!selectedTable}
          >
            Proceed to Preview
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default SelectTable; 