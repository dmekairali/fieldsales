// src/services/AuthService.js
import { supabase } from '../supabaseClient';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
  }

  // ===================================================================
  // AUTHENTICATION METHODS
  // ===================================================================

  /**
   * Sign in user with email and password
   */
  async signIn(email, password) {
    try {
      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (authError) {
        throw new Error(authError.message);
      }

      // Get user profile from user_profiles table
      const profile = await this.getUserProfile(email);
      
      if (!profile || !profile.is_active) {
        await supabase.auth.signOut();
        throw new Error('User profile not found or account is inactive');
      }

      // Update last login
      await this.updateLastLogin(profile.id);

      this.currentUser = {
        ...authData.user,
        profile: profile
      };

      this.notifyListeners('SIGNED_IN', this.currentUser);
      
      return {
        success: true,
        user: this.currentUser,
        profile: profile
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      this.currentUser = null;
      this.notifyListeners('SIGNED_OUT', null);

      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session && session.user) {
        // Validate user profile
        const profile = await this.getUserProfile(session.user.email);
        
        if (profile && profile.is_active) {
          this.currentUser = {
            ...session.user,
            profile: profile
          };
          return this.currentUser;
        } else {
          // Invalid profile, sign out
          await this.signOut();
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Session check error:', error);
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
  // USER PROFILE METHODS
  // ===================================================================

  /**
   * Get user profile from database
   */
  async getUserProfile(email) {
    try {
      const { data, error } = await supabase
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
          last_login,
          created_at,
          reporting_manager,
          area_sales_manager,
          regional_sales_manager,
          team_members
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

  /**
   * Check if user has required access level
   */
  hasAccess(requiredLevel) {
    if (!this.currentUser || !this.currentUser.profile) {
      return false;
    }

    const userLevel = this.currentUser.profile.access_level;
    
    // Access level hierarchy: admin > manager > mr > viewer
    const levelHierarchy = {
      'viewer': 1,
      'mr': 2,
      'manager': 3,
      'admin': 4
    };

    const userLevelNum = levelHierarchy[userLevel] || 0;
    const requiredLevelNum = levelHierarchy[requiredLevel] || 0;

    return userLevelNum >= requiredLevelNum;
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.hasAccess('admin');
  }

  /**
   * Check if user is manager or above
   */
  isManager() {
    return this.hasAccess('manager');
  }

  /**
   * Check if user is MR or above
   */
  isMR() {
    return this.hasAccess('mr');
  }

  /**
   * Get user territories
   */
  getUserTerritories() {
    if (!this.currentUser || !this.currentUser.profile) {
      return [];
    }
    return this.currentUser.profile.assigned_territories || [];
  }

  /**
   * Get user states
   */
  getUserStates() {
    if (!this.currentUser || !this.currentUser.profile) {
      return [];
    }
    return this.currentUser.profile.assigned_states || [];
  }

  // ===================================================================
  // EVENT LISTENERS
  // ===================================================================

  /**
   * Add auth state change listener
   */
  onAuthStateChange(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners
   */
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

  /**
   * Initialize auth service
   */
  async initialize() {
    try {
      // Check current session
      await this.getCurrentSession();

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
          this.currentUser = null;
          this.notifyListeners('SIGNED_OUT', null);
        } else if (event === 'SIGNED_IN' && session) {
          // Validate and set user profile
          const profile = await this.getUserProfile(session.user.email);
          if (profile && profile.is_active) {
            this.currentUser = {
              ...session.user,
              profile: profile
            };
            this.notifyListeners('SIGNED_IN', this.currentUser);
          }
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Auth service initialization error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
