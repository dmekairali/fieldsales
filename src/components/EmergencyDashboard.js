import React from 'react';
import { Shield, MapPin, Phone, Mail, User, Clock } from 'lucide-react';

const EmergencyDashboard = () => {
  const contacts = [
    { name: 'Dr. Anjali Sharma', role: 'Chief Medical Officer', phone: '+91 98765 43210', email: 'anjali.sharma@ayurai.com', location: 'Mumbai' },
    { name: 'Rohan Verma', role: 'Regional Manager', phone: '+91 98765 43211', email: 'rohan.verma@ayurai.com', location: 'Delhi' },
    { name: 'Priya Patel', role: 'Logistics Head', phone: '+91 98765 43212', email: 'priya.patel@ayurai.com', location: 'Bangalore' },
  ];

  return (
    <div className="p-6 bg-brand-light min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-brand-dark">Emergency Dashboard</h1>
        <div className="flex items-center gap-2 text-red-500">
          <Shield size={24} />
          <span className="font-semibold">Live Emergency</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Immediate Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">Request Medical Aid</button>
            <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">Report Incident</button>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">Contact Support</button>
            <button className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">View Protocols</button>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Emergency Contacts</h2>
          <div className="space-y-4">
            {contacts.map((contact, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-4">
                  <User size={20} className="text-brand-secondary" />
                  <div>
                    <p className="font-semibold text-brand-dark">{contact.name}</p>
                    <p className="text-sm text-gray-500">{contact.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-brand-secondary" />
                    <span className="text-sm text-brand-dark">{contact.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-brand-secondary" />
                    <span className="text-sm text-brand-dark">{contact.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-brand-secondary" />
                    <span className="text-sm text-brand-dark">{contact.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-brand-dark">Database Connection</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <p className="text-green-500 font-semibold">Online</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-brand-dark">Geo-tracking Service</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <p className="text-green-500 font-semibold">Active</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-brand-dark">Communication Gateway</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <p className="text-red-500 font-semibold">Offline</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-brand-dark">Last Update</p>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-brand-secondary" />
                <p className="text-brand-dark font-semibold">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyDashboard;
