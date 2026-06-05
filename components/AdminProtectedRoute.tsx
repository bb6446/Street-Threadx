import React from 'react';
import { AdminUser } from '../types';
import { Lock } from 'lucide-react';

interface AdminProtectedRouteProps {
  adminUser: AdminUser | null | undefined;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ 
  adminUser, 
  children, 
  fallback 
}) => {
  if (!adminUser) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-zinc-950/40 border border-zinc-900 rounded-lg text-center space-y-6 select-none animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black uppercase tracking-widest text-white">Access Unauthorized</h3>
          <p className="text-[10px] text-zinc-500 max-w-sm uppercase tracking-[0.2em] leading-relaxed">
            Administrative security clearance is required to render this terminal view. Please authenticate.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
