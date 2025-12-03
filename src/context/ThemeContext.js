"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';

const ThemeContext = createContext(null);

export const themes = {
  red: {
    id: 'red',
    name: 'Red Passion',
    primary: '#dc2626',
    primaryHover: '#b91c1c',
    gradient: 'from-red-500 to-red-600',
    gradientHover: 'from-red-600 to-red-700',
    ring: 'ring-red-100',
    border: 'border-red-600',
    text: 'text-red-600',
    bg: 'bg-red-600',
    bgHover: 'bg-red-700'
  },
  blue: {
    id: 'blue',
    name: 'Blue Ocean',
    primary: '#0072ab',
    primaryHover: '#005d8c',
    gradient: 'from-blue-500 to-blue-600',
    gradientHover: 'from-blue-600 to-blue-700',
    ring: 'ring-blue-100',
    border: 'border-blue-600',
    text: 'text-blue-600',
    bg: 'bg-blue-600',
    bgHover: 'bg-blue-700'
  },
  green: {
    id: 'green',
    name: 'Green Forest',
    primary: '#16a34a',
    primaryHover: '#15803d',
    gradient: 'from-green-500 to-green-600',
    gradientHover: 'from-green-600 to-green-700',
    ring: 'ring-green-100',
    border: 'border-green-600',
    text: 'text-green-600',
    bg: 'bg-green-600',
    bgHover: 'bg-green-700'
  },
  purple: {
    id: 'purple',
    name: 'Purple Galaxy',
    primary: '#9333ea',
    primaryHover: '#7e22ce',
    gradient: 'from-purple-500 to-purple-600',
    gradientHover: 'from-purple-600 to-purple-700',
    ring: 'ring-purple-100',
    border: 'border-purple-600',
    text: 'text-purple-600',
    bg: 'bg-purple-600',
    bgHover: 'bg-purple-700'
  },
  orange: {
    id: 'orange',
    name: 'Orange Sunset',
    primary: '#ea580c',
    primaryHover: '#c2410c',
    gradient: 'from-orange-500 to-orange-600',
    gradientHover: 'from-orange-600 to-orange-700',
    ring: 'ring-orange-100',
    border: 'border-orange-600',
    text: 'text-orange-600',
    bg: 'bg-orange-600',
    bgHover: 'bg-orange-700'
  }
};

export function ThemeProvider({ children, userType }) {
  const [currentTheme, setCurrentTheme] = useState(userType === 'driver' ? 'blue' : 'red');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadUserTheme();
  }, [userType]);

  async function loadUserTheme() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let tableName = '';
      if (userType === 'client') tableName = 'clients';
      else if (userType === 'driver') tableName = 'drivers';
      else if (userType === 'admin') tableName = 'admins';

      if (!tableName) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('theme')
        .eq('user_id', user.id)
        .single();

      if (!error && data?.theme) {
        setCurrentTheme(data.theme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  }

  const theme = themes[currentTheme] || themes.red;

  const value = {
    theme,
    currentTheme,
    setCurrentTheme,
    loading,
    themes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}