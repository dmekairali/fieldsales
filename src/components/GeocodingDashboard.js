// Google Maps Geocoding API Integration
import { supabase } from './supabaseClient';

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

    // Get customers without coordinates
    async getCustomersWithoutCoordinates() {
        const { data, error } = await supabase
            .from('customer_master')
            .select('id, customer_code, customer_name, full_address, city_name, pin_code')
            .or('latitude.is.null,longitude.is.null')
            .eq('status', 'ACTIVE')
            .not('full_address', 'is', null)
            .order('id');

        if (error) {
            console.error('Error fetching customers:', error);
            return [];
        }

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

    // Build address string for geocoding
    buildAddressString(customer) {
        const parts = [];
        
        if (customer.full_address) {
            parts.push(customer.full_address);
        }
        if (customer.city_name) {
            parts.push(customer.city_name);
        }
        if (customer.pin_code) {
            parts.push(customer.pin_code);
        }
        
        // Add India for better geocoding accuracy
        parts.push('India');
        
        return parts.filter(part => part && part.trim()).join(', ');
    }

    // Process single batch of customers
    async processBatch(customers, onProgress) {
        const results = [];
        
        for (let i = 0; i < customers.length; i++) {
            const customer = customers[i];
            const address = this.buildAddressString(customer);
            
            try {
                const geocodeResult = await this.geocodeAddress(address);
                
                if (geocodeResult.status === 'SUCCESS') {
                    const updateSuccess = await this.updateCustomerCoordinates(customer.id, geocodeResult);
                    if (updateSuccess) {
                        this.successCount++;
                    }
                } else {
                    this.errorCount++;
                    console.warn(`Failed to geocode: ${customer.customer_name} - ${address}`);
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

    // Get geocoding statistics
    async getGeocodingStats() {
        const { data, error } = await supabase
            .from('customer_master')
            .select('latitude, longitude')
            .eq('status', 'ACTIVE');

        if (error) {
            console.error('Error fetching stats:', error);
            return null;
        }

        const total = data.length;
        const withCoordinates = data.filter(item => item.latitude && item.longitude).length;
        const withoutCoordinates = total - withCoordinates;

        return {
            total,
            withCoordinates,
            withoutCoordinates,
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
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-blue-600 mb-4">
                        📍 Customer Geocoding Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Add GPS coordinates to customer addresses using Google Maps API
                    </p>
                </div>

                {/* Statistics Card */}
                {stats && (
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                        <h2 className="text-xl font-semibold mb-4">Geocoding Statistics</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                                <div className="text-sm text-gray-600">Total Customers</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{stats.withCoordinates}</div>
                                <div className="text-sm text-gray-600">With Coordinates</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{stats.withoutCoordinates}</div>
                                <div className="text-sm text-gray-600">Missing Coordinates</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{stats.completionPercentage}%</div>
                                <div className="text-sm text-gray-600">Completion Rate</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Control Panel */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Geocoding Control</h2>
                    
                    {!isRunning ? (
                        <button
                            onClick={startGeocoding}
                            disabled={stats?.withoutCoordinates === 0}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
                        >
                            {stats?.withoutCoordinates === 0 ? 'All Customers Geocoded!' : `Start Geocoding ${stats?.withoutCoordinates} Customers`}
                        </button>
                    ) : (
                        <div className="text-blue-600 font-semibold">
                            🔄 Geocoding in progress...
                        </div>
                    )}
                </div>

                {/* Progress Display */}
                {progress && (
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                        <h2 className="text-xl font-semibold mb-4">Progress</h2>
                        <div className="space-y-3">
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
                            <div className="mt-4">
                                <div className="text-sm text-gray-600 mb-2">Currently processing:</div>
                                <div className="font-medium">{progress.currentCustomer}</div>
                                <div className="text-sm text-gray-500">{progress.currentAddress}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Display */}
                {results && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Geocoding Results</h2>
                        <div className="space-y-2">
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
                            <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
                                {results.message}
                            </div>
                        )}
                        {results.error && (
                            <div className="mt-4 p-3 bg-red-100 text-red-800 rounded">
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
