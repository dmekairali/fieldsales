// src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import authService from '../services/AuthService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initializeAuth();

    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChange((event, userData) => {
      switch (event) {
        case 'SIGNED_IN':
          setUser(userData);
          setIsAuthenticated(true);
          setLoading(false);
          break;
        case 'SIGNED_OUT':
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          break;
        case 'PROFILE_UPDATED':
          setUser(userData);
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      await authService.initialize();
      const currentUser = await authService.getCurrentSession();
      
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const result = await authService.signIn(email, password);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user?.profile?.id) {
        throw new Error('No user profile found');
      }
      
      const updatedProfile = await authService.updateProfile(user.profile.id, updates);
      return updatedProfile;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const hasAccess = (requiredLevel) => {
    return authService.hasAccess(requiredLevel);
  };

  const isAdmin = () => {
    return authService.isAdmin();
  };

  const isManager = () => {
    return authService.isManager();
  };

  const isMR = () => {
    return authService.isMR();
  };

  const getUserTerritories = () => {
    return authService.getUserTerritories();
  };

  const getUserStates = () => {
    return authService.getUserStates();
  };

  return {
    user,
    loading,
    isAuthenticated,
    signIn,
    signOut,
    updateProfile,
    hasAccess,
    isAdmin,
    isManager,
    isMR,
    getUserTerritories,
    getUserStates,
    profile: user?.profile || null,
    refreshAuth: initializeAuth
  };
};
