import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  CheckCircle,
  Users,
  Shield,
  MapPin,
  BarChart3
} from 'lucide-react';

const LoginPage = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // User is already logged in, validate with user_profiles
        await validateUserProfile(session.user);
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  };

  const validateUserProfile = async (user) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (error || !profile) {
        setError('User profile not found or inactive');
        await supabase.auth.signOut();
        return;
      }

      // Update last login
      await supabase
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', profile.id);

      onLoginSuccess?.(profile);
    } catch (error) {
      console.error('Profile validation error:', error);
      setError('Failed to validate user profile');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // First, validate input
      if (!formData.email || !formData.password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Validate user profile exists and is active
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          full_name,
          employee_id,
          access_level,
          mr_name,
          assigned_territories,
          assigned_states,
          is_active,
          reporting_manager,
          area_sales_manager,
          regional_sales_manager,
          team_members
        `)
        .eq('email', formData.email.trim().toLowerCase())
        .eq('is_active', true)
        .single();

      if (profileError || !profile) {
        setError('User profile not found or account is inactive. Please contact your administrator.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Update last login timestamp
      await supabase
        .from('user_profiles')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      setSuccess('Login successful! Redirecting...');
      
      // Call the success callback with user profile
      setTimeout(() => {
        onLoginSuccess?.(profile);
      }, 1000);

    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const getAccessLevelDisplay = (level) => {
    const levels = {
      'admin': { label: 'Administrator', icon: Shield, color: 'text-red-600' },
      'manager': { label: 'Manager', icon: Users, color: 'text-purple-600' },
      'mr': { label: 'Medical Representative', icon: MapPin, color: 'text-blue-600' },
      'viewer': { label: 'Viewer', icon: BarChart3, color: 'text-green-600' }
    };
    return levels[level] || { label: level, icon: Users, color: 'text-gray-600' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your Field Sales Dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700">{success}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-violet-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Need help? Contact your system administrator
              </p>
            </div>
          </div>
        </div>

        {/* Access Levels Info */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Access Levels</h3>
          <div className="grid grid-cols-2 gap-2">
            {['admin', 'manager', 'mr', 'viewer'].map(level => {
              const { label, icon: Icon, color } = getAccessLevelDisplay(level);
              return (
                <div key={level} className="flex items-center space-x-2 text-xs">
                  <Icon className={`h-3 w-3 ${color}`} />
                  <span className="text-gray-600">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
