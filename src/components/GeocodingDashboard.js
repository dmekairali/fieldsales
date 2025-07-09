// Google Maps Geocoding API Integration
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Configuration
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const BATCH_SIZE = 50; // Process 50 addresses at a time to stay within rate limits
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

class GeocodingService {
    constructor() {
        this.processedCount = 0;
        this.successCount = 0;
        this.errorCount = 0;
        this.isProcessing = false;
    }

    // Single address geocoding
    async geocodeAddress(address) {
        if (!address || address.trim() === '') {
            throw new Error('Address is required');
        }

        const encodedAddress = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                return {
                    latitude: location.lat,
                    longitude: location.lng,
                    formatted_address: data.results[0].formatted_address,
                    status: 'SUCCESS'
                };
            } else {
                return {
                    latitude: null,
                    longitude: null,
                    formatted_address: null,
                    status: 'FAILED',
                    error: data.status
                };
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            return {
                latitude: null,
                longitude: null,
                formatted_address: null,
                status: 'ERROR',
                error: error.message
            };
        }
    }

    // Get customers without coordinates (fixed to get ALL customers)
    async getCustomersWithoutCoordinates() {
        // First, get the count
        const { count, error: countError } = await supabase
            .from('customer_master')
            .select('*', { count: 'exact', head: true })
            .or('latitude.is.null,longitude.is.null')
            .eq('status', 'ACTIVE')
            .not('full_address', 'is', null);

        if (countError) {
            console.error('Error counting customers:', countError);
        } else {
            console.log(`Total customers needing geocoding: ${count}`);
        }

        // Get all customers without coordinates (no limit)
        const { data, error } = await supabase
            .from('customer_master')
            .select('id, customer_code, customer_name, full_address, city_name, pin_code')
            .or('latitude.is.null,longitude.is.null')
            .eq('status', 'ACTIVE')
            .not('full_address', 'is', null)
            .order('id')
            .limit(10000); // Set high limit to get all

        if (error) {
            console.error('Error fetching customers:', error);
            return [];
        }

        console.log(`Fetched ${data?.length || 0} customers for geocoding`);
        return data || [];
    }

    // Update customer coordinates in database
    async updateCustomerCoordinates(customerId, geocodeResult) {
        const { error } = await supabase
            .from('customer_master')
            .update({
                latitude: geocodeResult.latitude,
                longitude: geocodeResult.longitude,
                updated_at: new Date().toISOString()
            })
            .eq('id', customerId);

        if (error) {
            console.error('Error updating coordinates:', error);
            return false;
        }
        return true;
    }

    // Build address string for geocoding (improved based on Apps Script success)
    buildAddressString(customer) {
        const parts = [];
        
        // Keep full address exactly as is (including Plus Codes - they help!)
        if (customer.full_address && customer.full_address.trim()) {
            parts.push(customer.full_address.trim());
        }
        
        // Only add city if it's not already in the address
        if (customer.city_name && customer.city_name.trim()) {
            const cityName = customer.city_name.trim();
            const currentAddress = parts.join(', ').toLowerCase();
            if (!currentAddress.includes(cityName.toLowerCase())) {
                parts.push(cityName);
            }
        }
        
        // Only add pincode if not already present
        if (customer.pin_code && customer.pin_code.trim()) {
            const pinCode = customer.pin_code.trim();
            const currentAddress = parts.join(', ');
            if (!currentAddress.includes(pinCode)) {
                parts.push(pinCode);
            }
        }
        
        // Add India if not already present
        const addressStr = parts.join(', ');
        if (!addressStr.toLowerCase().includes('india')) {
            parts.push('India');
        }
        
        return parts.join(', ');
    }

    // Enhanced geocoding with multiple strategies like your Apps Script
    async geocodeAddressWithFallback(customer) {
        // Strategy 1: Full address (exactly like your Apps Script)
        const fullAddress = this.buildAddressString(customer);
        let result = await this.geocodeAddress(fullAddress);
        if (result.status === 'SUCCESS') {
            return { ...result, strategy: 'full_address' };
        }

        // Strategy 2: Plus Code only (if present)
        if (customer.full_address) {
            const plusCodeMatch = customer.full_address.match(/[A-Z0-9]{4}\+[A-Z0-9]{2,}/);
            if (plusCodeMatch) {
                const plusCodeAddress = `${plusCodeMatch[0]}, ${customer.city_name || ''}, India`;
                result = await this.geocodeAddress(plusCodeAddress);
                if (result.status === 'SUCCESS') {
                    return { ...result, strategy: 'plus_code' };
                }
            }
        }

        // Strategy 3: Simplified with state (common in Indian addresses)
        if (customer.city_name && customer.pin_code) {
            // Try to detect state from full address
            const stateKeywords = ['delhi', 'mumbai', 'bangalore', 'kolkata', 'chennai', 'hyderabad', 'pune', 'odisha', 'uttar pradesh', 'maharashtra', 'karnataka', 'tamil nadu', 'west bengal', 'telangana'];
            let detectedState = '';
            
            if (customer.full_address) {
                const addressLower = customer.full_address.toLowerCase();
                for (const state of stateKeywords) {
                    if (addressLower.includes(state)) {
                        detectedState = state;
                        break;
                    }
                }
            }
            
            const stateAddress = detectedState 
                ? `${customer.city_name}, ${detectedState}, ${customer.pin_code}, India`
                : `${customer.city_name}, ${customer.pin_code}, India`;
                
            result = await this.geocodeAddress(stateAddress);
            if (result.status === 'SUCCESS') {
                return { ...result, strategy: 'city_state_pin' };
            }
        }

        // Strategy 4: Just PIN code (very reliable in India)
        if (customer.pin_code) {
            result = await this.geocodeAddress(`${customer.pin_code}, India`);
            if (result.status === 'SUCCESS') {
                return { ...result, strategy: 'pin_only' };
            }
        }

        // Strategy 5: Just city
        if (customer.city_name) {
            result = await this.geocodeAddress(`${customer.city_name}, India`);
            if (result.status === 'SUCCESS') {
                return { ...result, strategy: 'city_only' };
            }
        }

        return { 
            latitude: null, 
            longitude: null, 
            status: 'FAILED', 
            error: 'All strategies failed',
            strategy: 'none'
        };
    }

    // Process single batch of customers
    async processBatch(customers, onProgress) {
        const results = [];
        
        for (let i = 0; i < customers.length; i++) {
            const customer = customers[i];
            const address = this.buildAddressString(customer);
            
            try {
                const geocodeResult = await this.geocodeAddressWithFallback(customer);
                
                if (geocodeResult.status === 'SUCCESS') {
                    const updateSuccess = await this.updateCustomerCoordinates(customer.id, geocodeResult);
                    if (updateSuccess) {
                        this.successCount++;
                        console.log(`✅ Success (${geocodeResult.strategy}): ${customer.customer_name}`);
                    }
                } else {
                    this.errorCount++;
                    console.warn(`❌ Failed: ${customer.customer_name} - ${address} (tried all strategies)`);
                }
                
                this.processedCount++;
                
                // Report progress
                if (onProgress) {
                    onProgress({
                        processed: this.processedCount,
                        success: this.successCount,
                        errors: this.errorCount,
                        currentCustomer: customer.customer_name,
                        currentAddress: address,
                        result: geocodeResult
                    });
                }
                
                results.push({
                    customer: customer,
                    address: address,
                    result: geocodeResult
                });
                
                // Small delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                this.errorCount++;
                console.error(`Error processing customer ${customer.customer_name}:`, error);
            }
        }
        
        return results;
    }

    // Main function to geocode all customers
    async geocodeAllCustomers(onProgress, onComplete) {
        if (this.isProcessing) {
            throw new Error('Geocoding is already in progress');
        }

        this.isProcessing = true;
        this.processedCount = 0;
        this.successCount = 0;
        this.errorCount = 0;

        try {
            // Get customers without coordinates
            const customers = await this.getCustomersWithoutCoordinates();
            
            if (customers.length === 0) {
                if (onComplete) {
                    onComplete({
                        totalCustomers: 0,
                        processed: 0,
                        success: 0,
                        errors: 0,
                        message: 'All customers already have coordinates!'
                    });
                }
                return;
            }

            console.log(`Starting geocoding for ${customers.length} customers...`);

            // Process in batches
            for (let i = 0; i < customers.length; i += BATCH_SIZE) {
                const batch = customers.slice(i, i + BATCH_SIZE);
                const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(customers.length / BATCH_SIZE);
                
                console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} customers)`);
                
                await this.processBatch(batch, onProgress);
                
                // Delay between batches to respect rate limits
                if (i + BATCH_SIZE < customers.length) {
                    console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
                }
            }

            // Final completion callback
            if (onComplete) {
                onComplete({
                    totalCustomers: customers.length,
                    processed: this.processedCount,
                    success: this.successCount,
                    errors: this.errorCount,
                    message: 'Geocoding completed!'
                });
            }

        } catch (error) {
            console.error('Geocoding process error:', error);
            if (onComplete) {
                onComplete({
                    totalCustomers: 0,
                    processed: this.processedCount,
                    success: this.successCount,
                    errors: this.errorCount,
                    error: error.message
                });
            }
        } finally {
            this.isProcessing = false;
        }
    }

    // Get geocoding statistics (improved with detailed logging)
    async getGeocodingStats() {
        console.log('Fetching geocoding statistics...');
        
        const { data, error } = await supabase
            .from('customer_master')
            .select('latitude, longitude, full_address, status')
            .eq('status', 'ACTIVE');

        if (error) {
            console.error('Error fetching stats:', error);
            return null;
        }

        console.log(`Total active customers in database: ${data.length}`);

        const total = data.length;
        const withCoordinates = data.filter(item => item.latitude && item.longitude).length;
        const withoutCoordinates = total - withCoordinates;
        const hasAddress = data.filter(item => item.full_address && item.full_address.trim()).length;
        const noAddress = total - hasAddress;

        console.log('Statistics breakdown:');
        console.log(`- Total: ${total}`);
        console.log(`- With coordinates: ${withCoordinates}`);
        console.log(`- Without coordinates: ${withoutCoordinates}`);
        console.log(`- Has address: ${hasAddress}`);
        console.log(`- No address: ${noAddress}`);

        return {
            total,
            withCoordinates,
            withoutCoordinates,
            hasAddress,
            noAddress,
            completionPercentage: total > 0 ? (withCoordinates / total * 100).toFixed(1) : 0
        };
    }
}

// React Component for Geocoding UI
const GeocodingDashboard = () => {
    const [geocodingService] = useState(new GeocodingService());
    const [stats, setStats] = useState(null);
    const [progress, setProgress] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState(null);

    // Load initial stats
    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        const statsData = await geocodingService.getGeocodingStats();
        setStats(statsData);
    };

    const startGeocoding = async () => {
        setIsRunning(true);
        setProgress(null);
        setResults(null);

        await geocodingService.geocodeAllCustomers(
            // Progress callback
            (progressData) => {
                setProgress(progressData);
            },
            // Completion callback
            (resultData) => {
                setResults(resultData);
                setIsRunning(false);
                loadStats(); // Reload stats after completion
            }
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                <div className="mb-4 sm:mb-6 md:mb-8 text-center">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 mb-1 sm:mb-2 md:mb-4">
                        📍 Customer Geocoding Dashboard
                    </h1>
                    <p className="text-gray-600 text-xs sm:text-sm md:text-base">
                        Add GPS coordinates to customer addresses using Google Maps API
                    </p>
                </div>

                {/* Statistics Card */}
                {stats && (
                    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
                        <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4">Geocoding Statistics</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                            <div className="text-center p-2 bg-blue-50 rounded-lg">
                                <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{stats.total}</div>
                                <div className="text-xs text-gray-600">Total Customers</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded-lg">
                                <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{stats.withCoordinates}</div>
                                <div className="text-xs text-gray-600">With Coords</div>
                            </div>
                            <div className="text-center p-2 bg-red-50 rounded-lg">
                                <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{stats.withoutCoordinates}</div>
                                <div className="text-xs text-gray-600">Missing Coords</div>
                            </div>
                            <div className="text-center p-2 bg-purple-50 rounded-lg">
                                <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">{stats.completionPercentage}%</div>
                                <div className="text-xs text-gray-600">Completion</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Control Panel */}
                <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4">Geocoding Control</h2>
                    
                    {!isRunning ? (
                        <button
                            onClick={startGeocoding}
                            disabled={stats?.withoutCoordinates === 0}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold text-sm md:text-base"
                        >
                            {stats?.withoutCoordinates === 0 ? 'All Customers Geocoded!' : `Start Geocoding ${stats?.withoutCoordinates || ''} Customers`}
                        </button>
                    ) : (
                        <div className="text-blue-600 font-semibold text-sm md:text-base">
                            🔄 Geocoding in progress...
                        </div>
                    )}
                </div>

                {/* Progress Display */}
                {progress && (
                    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
                        <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4">Progress</h2>
                        <div className="space-y-1.5 sm:space-y-2 md:space-y-3 text-xs sm:text-sm md:text-base">
                            <div className="flex justify-between">
                                <span>Processed:</span>
                                <span className="font-semibold">{progress.processed}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Successful:</span>
                                <span className="font-semibold text-green-600">{progress.success}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Errors:</span>
                                <span className="font-semibold text-red-600">{progress.errors}</span>
                            </div>
                            <div className="mt-2 sm:mt-3 md:mt-4">
                                <div className="text-xs text-gray-600 mb-1">Currently processing:</div>
                                <div className="font-medium truncate text-xs sm:text-sm">{progress.currentCustomer}</div>
                                <div className="text-xs text-gray-500 truncate">{progress.currentAddress}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Display */}
                {results && (
                    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
                        <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4">Geocoding Results</h2>
                        <div className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm md:text-base">
                            <div className="flex justify-between">
                                <span>Total Customers:</span>
                                <span className="font-semibold">{results.totalCustomers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Successfully Geocoded:</span>
                                <span className="font-semibold text-green-600">{results.success}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Failed:</span>
                                <span className="font-semibold text-red-600">{results.errors}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Success Rate:</span>
                                <span className="font-semibold text-blue-600">
                                    {results.totalCustomers > 0 ? (results.success / results.totalCustomers * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>
                        {results.message && (
                            <div className="mt-2 sm:mt-3 md:mt-4 p-2 md:p-3 bg-green-100 text-green-800 rounded text-xs sm:text-sm md:text-base">
                                {results.message}
                            </div>
                        )}
                        {results.error && (
                            <div className="mt-2 sm:mt-3 md:mt-4 p-2 md:p-3 bg-red-100 text-red-800 rounded text-xs sm:text-sm md:text-base">
                                Error: {results.error}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export { GeocodingService, GeocodingDashboard };
export default GeocodingDashboard;
