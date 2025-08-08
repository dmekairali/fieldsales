// src/hooks/useMedicalRepresentatives.js
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
export const useMedicalRepresentatives = () => {
    const [mrList, setMrList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMRs = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('medical_representatives')
                .select(`
                    id,
                    employee_id,
                    name,
                    phone,
                    email,
                    territory,
                    manager_name,
                    joining_date,
                    monthly_target,
                    is_active
                `)
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (fetchError) {
                console.error('Error fetching MRs:', fetchError);
                setError(fetchError.message);
            } else {
                setMrList(data || []);
                console.log(`Loaded ${data?.length || 0} active MRs from database`);
            }
        } catch (error) {
            console.error('Unexpected error fetching MRs:', error);
            setError('Failed to connect to database');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMRs();
    }, []);

    useEffect(() => {
        const mrSubscription = supabase
            .channel('medical_representatives_changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'medical_representatives' 
                }, 
                (payload) => {
                    console.log('MR data changed:', payload);
                    // Refresh the MR list when changes occur
                    fetchMRs();
                }
            )
            .subscribe();

        return () => {
            mrSubscription.unsubscribe();
        };
    }, []);

    // Helper function to get MR details by name
    const getMRByName = (name) => {
        return mrList.find(mr => mr.name === name);
    };

    // Helper function to get MR details by employee ID
    const getMRByEmployeeId = (employeeId) => {
        return mrList.find(mr => mr.employee_id === employeeId);
    };

    // Get MRs by territory
    const getMRsByTerritory = (territory) => {
        return mrList.filter(mr => 
            mr.territory.toLowerCase().includes(territory.toLowerCase())
        );
    };

    // Get MRs by manager
    const getMRsByManager = (managerName) => {
        return mrList.filter(mr => 
            mr.manager_name && 
            mr.manager_name.toLowerCase().includes(managerName.toLowerCase())
        );
    };

    return {
        mrList,
        loading,
        error,
        refetch: fetchMRs,
        getMRByName,
        getMRByEmployeeId,
        getMRsByTerritory,
        getMRsByManager,
        totalMRs: mrList.length
    };
};
