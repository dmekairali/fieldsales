// Emergency Dashboard Component (React)
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const EmergencyDashboard = () => {
    const [zeroROITerritories, setZeroROITerritories] = useState([]);
    const [suspiciousVisits, setSuspiciousVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmergencyData();
    }, []);

    const fetchEmergencyData = async () => {
        try {
            // Fetch zero ROI territories
            const { data: territories } = await supabase
                .from('emergency_territory_audit')
                .select('*')
                .order('total_visits_90d', { ascending: false });

            // Fetch suspicious visits for today
            const { data: visits } = await supabase
                .from('suspicious_visits')
                .select('*')
                .gte('dcrDate', new Date().toISOString().split('T')[0])
                .neq('quality_flag', 'NORMAL');

            setZeroROITerritories(territories || []);
            setSuspiciousVisits(visits || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching emergency data:', error);
            setLoading(false);
        }
    };

    const flagTerritory = async (territory, action) => {
        // Implementation for flagging territories
        console.log(`Flagging ${territory} for ${action}`);
    };

    if (loading) return <div>Loading emergency data...</div>;

    return (
        <div className="emergency-dashboard">
            <h1>🚨 Emergency Territory & Visit Quality Dashboard</h1>
            
            {/* Zero ROI Territories */}
            <div className="zero-roi-section">
                <h2>Zero ROI Territories (IMMEDIATE ACTION REQUIRED)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Territory</th>
                            <th>MR Name</th>
                            <th>Total Visits (90d)</th>
                            <th>Total Sales</th>
                            <th>Revenue/Visit</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {zeroROITerritories.map((territory, index) => (
                            <tr key={index} className={territory.total_sales_90d === 0 ? 'critical' : 'warning'}>
                                <td>{territory.territory}</td>
                                <td>{territory.mr_name}</td>
                                <td>{territory.total_visits_90d}</td>
                                <td>₹{territory.total_sales_90d}</td>
                                <td>₹{territory.revenue_per_visit?.toFixed(2)}</td>
                                <td>
                                    <button 
                                        onClick={() => flagTerritory(territory.territory, 'REMOVE')}
                                        className="btn-danger"
                                    >
                                        Remove Territory
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Suspicious Visits Today */}
            <div className="suspicious-visits-section">
                <h2>Suspicious Visits Today</h2>
                <div className="visit-alerts">
                    {suspiciousVisits.map((visit, index) => (
                        <div key={index} className={`visit-alert ${visit.quality_flag.toLowerCase()}`}>
                            <span className="mr-name">{visit.empName}</span>
                            <span className="client-name">{visit.clientName}</span>
                            <span className="duration">{visit.visitTime}</span>
                            <span className="flag">{visit.quality_flag}</span>
                            <span className="sales">₹{visit.amountOfSale}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EmergencyDashboard;
