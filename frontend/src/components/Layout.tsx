import React from 'react';
import { User } from '../types';

interface LayoutProps {
  user: User | null;
  title: string;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, title, onLogout, children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100">
      {/* Navigation Bar */}
      <nav className="border-b border-brand-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-xl font-bold text-brand-700">RigPro JSA</div>
              <h1 className="text-lg font-semibold text-brand-900">{title}</h1>
            </div>
            <div className="flex items-center gap-4">
              {user && <span className="text-sm text-brand-700">{user.full_name}</span>}
              <button
                onClick={onLogout}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
