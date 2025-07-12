import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

const VisitQualityMonitor = ({ mrName }) => {
  const qualityData = [
    { id: 1, doctor: 'Dr. Mehta', quality: 'Good', duration: '15 min', outcome: 'Positive' },
    { id: 2, doctor: 'Dr. Gupta', quality: 'Poor', duration: '5 min', outcome: 'Negative' },
    { id: 3, doctor: 'Dr. Singh', quality: 'Average', duration: '10 min', outcome: 'Neutral' },
    { id: 4, doctor: 'Dr. Verma', quality: 'Good', duration: '20 min', outcome: 'Positive' },
    { id: 5, doctor: 'Dr. Reddy', quality: 'Poor', duration: '3 min', outcome: 'Negative' },
  ];

  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'Good':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'Poor':
        return <XCircle size={20} className="text-red-500" />;
      case 'Average':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const getOutcomeIcon = (outcome) => {
    switch (outcome) {
      case 'Positive':
        return <TrendingUp size={20} className="text-green-500" />;
      case 'Negative':
        return <TrendingDown size={20} className="text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-brand-light min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-brand-dark">Visit Quality Monitor</h1>
        {mrName && <p className="text-lg text-brand-secondary">MR: {mrName}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Overall Quality</h2>
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center">
              <p className="text-4xl font-bold text-green-500">85%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Average Duration</h2>
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center">
              <p className="text-4xl font-bold text-blue-500">12m</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-brand-dark mb-4">Positive Outcomes</h2>
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-yellow-100 rounded-full flex items-center justify-center">
              <p className="text-4xl font-bold text-yellow-500">75%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-brand-dark mb-4">Recent Visits</h2>
        <table className="w-full">
          <thead>
            <tr className="text-left text-brand-dark">
              <th className="p-2">Doctor</th>
              <th className="p-2">Quality</th>
              <th className="p-2">Duration</th>
              <th className="p-2">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {qualityData.map((visit) => (
              <tr key={visit.id} className="border-b border-gray-200">
                <td className="p-2">{visit.doctor}</td>
                <td className="p-2 flex items-center gap-2">
                  {getQualityIcon(visit.quality)}
                  <span>{visit.quality}</span>
                </td>
                <td className="p-2 flex items-center gap-2">
                  <Clock size={16} className="text-brand-secondary" />
                  <span>{visit.duration}</span>
                </td>
                <td className="p-2 flex items-center gap-2">
                  {getOutcomeIcon(visit.outcome)}
                  <span>{visit.outcome}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VisitQualityMonitor;
