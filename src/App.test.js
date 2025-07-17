import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { useAuth } from './hooks/useAuth';

jest.mock('./hooks/useAuth');

describe('App', () => {
  it('renders the login page when the user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<App />);
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('renders the main application when the user is authenticated', () => {
    useAuth.mockReturnValue({ user: { id: '123', email: 'test@example.com' }, loading: false });
    render(<App />);
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
  });
});
