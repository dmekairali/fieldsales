import React from 'react';
import { MapPin, Check, X, Edit, UploadCloud } from 'lucide-react';

const GeocodingDashboard = () => {
  const locations = [
    { id: 1, name: 'Apollo Pharmacy', address: '123, Main Road, Delhi', status: 'Verified' },
    { id: 2, name: 'MedPlus Pharmacy', address: '456, MG Road, Mumbai', status: 'Pending' },
    { id: 3, name: 'Wellness Forever', address: '789, Brigade Road, Bangalore', status: 'Rejected' },
    { id: 4, name: 'Fortis Pharmacy', address: '101, Park Street, Kolkata', status: 'Verified' },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Verified':
        return <Check size={20} className="text-green-500" />;
      case 'Pending':
        return <Edit size={20} className="text-yellow-500" />;
      case 'Rejected':
        return <X size={20} className="text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-brand-light min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-brand-dark">Geocoding Dashboard</h1>
        <button className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2">
          <UploadCloud size={20} />
          <span>Upload CSV</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-brand-dark mb-4">Location Status</h2>
        <table className="w-full">
          <thead>
            <tr className="text-left text-brand-dark">
              <th className="p-2">Location Name</th>
              <th className="p-2">Address</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((location) => (
              <tr key={location.id} className="border-b border-gray-200">
                <td className="p-2 flex items-center gap-2">
                  <MapPin size={16} className="text-brand-secondary" />
                  <span>{location.name}</span>
                </td>
                <td className="p-2">{location.address}</td>
                <td className="p-2 flex items-center gap-2">
                  {getStatusIcon(location.status)}
                  <span>{location.status}</span>
                </td>
                <td className="p-2">
                  <button className="text-brand-primary hover:text-brand-secondary">
                    <Edit size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GeocodingDashboard;
