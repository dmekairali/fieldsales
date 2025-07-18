// src/components/ProtectedRoute.js
import React, { useState, useEffect } from 'react';
import authService from '../services/AuthService';
import LoginPage from './LoginPage';
import { Loader, Shield } from 'lucide-react';

const ProtectedRoute = ({ 
  children, 
  requiredAccess = 'viewer',
  fallback = null 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    initializeAuth();
    
    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange((event, userData) => {
      if (event === 'SIGNED_IN') {
        setUser(userData);
        setIsAuthenticated(true);
        setHasAccess(authService.hasAccess(requiredAccess));
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setHasAccess(false);
      }
    });

    return () => unsubscribe();
  }, [requiredAccess]);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Initialize auth service
      await authService.initialize();
      
      // Check current session
      const currentUser = await authService.getCurrentSession();
      
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        setHasAccess(authService.hasAccess(requiredAccess));
      } else {
        setIsAuthenticated(false);
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setIsAuthenticated(false);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (profile) => {
    setUser({ profile });
    setIsAuthenticated(true);
    setHasAccess(authService.hasAccess(requiredAccess));
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Loader className="h-8 w-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we verify your session</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Show access denied if user doesn't have required permissions
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <p className="text-gray-600 mb-4">
              You don't have sufficient permissions to access this resource.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p><strong>Your access level:</strong> {user?.profile?.access_level || 'Unknown'}</p>
              <p><strong>Required access level:</strong> {requiredAccess}</p>
              <p><strong>User:</strong> {user?.profile?.full_name || 'Unknown'}</p>
            </div>
          </div>
          <button
            onClick={() => authService.signOut()}
            className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-red-700 hover:to-orange-700 transition-all"
          >
            Sign Out
          </button>
          {fallback && (
            <div className="mt-4">
              {fallback}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render protected content
  return children;
};

export default ProtectedRoute;
