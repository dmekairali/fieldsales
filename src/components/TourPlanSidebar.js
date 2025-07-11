// src/components/TourPlanSidebar.js
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  RotateCcw, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3, 
  Award, 
  FileText, 
  Settings,
  ChevronRight,
  User
} from 'lucide-react';

const TourPlanSidebar = ({ onNavigate, activeItem }) => {
  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard Overview',
      path: '/dashboard',
      key: 'dashboard'
    },
    {
      icon: Calendar,
      label: 'Monthly Planning',
      path: '/monthly-planning',
      key: 'monthly-tour'
    },
    {
      icon: RotateCcw,
      label: 'Weekly Revision',
      path: '/weekly-revision',
      key: 'weekly-revision',
      badge: '3'
    },
    {
      icon: TrendingUp,
      label: 'Performance Analytics',
      path: '/performance',
      key: 'analytics'
    },
    {
      icon: AlertTriangle,
      label: 'Emergency Territory',
      path: '/emergency',
      key: 'emergency',
      badge: '2',
      badgeColor: 'bg-red-500'
    },
    {
      icon: BarChart3,
      label: 'Visit Quality Analysis',
      path: '/visit-quality',
      key: 'quality',
      badge: '5'
    },
    {
      icon: Award,
      label: 'NBD Performance',
      path: '/nbd-performance',
      key: 'nbd'
    },
    {
      icon: FileText,
      label: 'Reports & Analytics',
      path: '/reports',
      key: 'reports'
    }
  ];

  const MenuItem = ({ 
    icon: Icon, 
    label, 
    badge, 
    badgeColor = 'bg-blue-500', 
    isActive = false, 
    onClick 
  }) => (
    <div 
      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group ${
        isActive 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <Icon size={20} className={`${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
        <span className="font-medium text-sm">{label}</span>
      </div>
      {badge && (
        <span className={`${badgeColor} text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center`}>
          {badge}
        </span>
      )}
    </div>
  );

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">TourPlan Pro</h1>
            <p className="text-sm text-gray-500">Territory Management</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <MenuItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            badgeColor={item.badgeColor}
            isActive={activeItem === item.key}
            onClick={() => onNavigate && onNavigate(item.path)}
          />
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Admin User</p>
              <p className="text-xs text-gray-500">Territory Manager</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>

        {/* Settings */}
        <div className="mt-2">
          <MenuItem
            icon={Settings}
            label="Settings"
            isActive={activeItem === 'settings'}
            onClick={() => onNavigate && onNavigate('/settings')}
          />
        </div>
      </div>
    </div>
  );
};

export default TourPlanSidebar;
