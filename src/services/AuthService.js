// src/services/AuthService.js
import { supabase } from '../supabaseClient';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    this.initialize();
  }

  // ===================================================================
  // AUTHENTICATION METHODS
  // ===================================================================

  /**
   * Sign in user with email and password by checking the user_profiles table
   */
  async signIn(email, password) {
    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Fetch user profile from the database
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', trimmedEmail)
        .single();

      if (error || !profile) {
        throw new Error('User profile not found.');
      }
      
      // Check if the account is active
      if (!profile.is_active) {
        throw new Error('Your account is inactive. Please contact your administrator.');
      }

      // WARNING: Storing and comparing passwords in plain text is highly insecure.
      // This is implemented as per the request.
      if (profile.password !== password) {
        throw new Error('Invalid email or password.');
      }

      // If credentials are correct, update last login
      await this.updateLastLogin(profile.id);

      // Set the user session
      this.currentUser = { profile };
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

      this.notifyListeners('SIGNED_IN', this.currentUser);
      
      return {
        success: true,
        user: this.currentUser,
        profile: this.currentUser.profile
      };

    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    this.notifyListeners('SIGNED_OUT', null);
    return { success: true };
  }

  /**
   * Get current session from localStorage
   */
  async getCurrentSession() {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
        return this.currentUser;
      }
      return null;
    } catch (error) {
      console.error('Session check error:', error);
      this.currentUser = null;
      localStorage.removeItem('currentUser');
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.currentUser !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  // ===================================================================
  // USER PROFILE METHODS (can remain mostly the same)
  // ===================================================================

  /**
   * Get user profile from database
   */
  async getUserProfile(email) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id, email, full_name, employee_id, access_level, mr_name,
          assigned_territories, assigned_states, is_active, last_login, created_at,
          reporting_manager, area_sales_manager, regional_sales_manager, team_members
        `)
        .eq('email', email.trim().toLowerCase())
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating last login:', error);
      }
    } catch (error) {
      console.error('Update last login error:', error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Update current user if it's the same user
      if (this.currentUser && this.currentUser.profile.id === userId) {
        this.currentUser.profile = { ...this.currentUser.profile, ...data };
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.notifyListeners('PROFILE_UPDATED', this.currentUser);
      }

      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // ===================================================================
  // ACCESS CONTROL METHODS
  // ===================================================================

  hasAccess(requiredLevel) {
    if (!this.currentUser || !this.currentUser.profile) {
      return false;
    }
    const userLevel = this.currentUser.profile.access_level;
    const levelHierarchy = { 'viewer': 1, 'mr': 2, 'manager': 3, 'admin': 4 };
    return (levelHierarchy[userLevel] || 0) >= (levelHierarchy[requiredLevel] || 0);
  }

  isAdmin() { return this.hasAccess('admin'); }
  isManager() { return this.hasAccess('manager'); }
  isMR() { return this.hasAccess('mr'); }

  getUserTerritories() {
    return this.currentUser?.profile?.assigned_territories || [];
  }

  getUserStates() {
    return this.currentUser?.profile?.assigned_states || [];
  }

  // ===================================================================
  // EVENT LISTENERS
  // ===================================================================

  onAuthStateChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  // ===================================================================
  // INITIALIZATION
  // ===================================================================

  async initialize() {
    await this.getCurrentSession();
    // No need to listen to supabase.auth events anymore
  }
}

const authService = new AuthService();
export default authService;
