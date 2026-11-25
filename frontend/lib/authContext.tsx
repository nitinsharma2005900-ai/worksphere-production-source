'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  avatarUrl?: string | null;
}

export interface Membership {
  id: string;
  organizationId: string;
  organizationName: string;
  role: 'PLATFORM_ADMIN' | 'ORG_OWNER' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'AUDITOR';
  status: string;
}

interface AuthContextType {
  user: User | null;
  currentOrgId: string | null;
  role: string | null;
  memberships: Membership[];
  loading: boolean;
  login: (token: string, refreshToken: string, orgId: string, role: string, user: User) => void;
  logout: () => void;
  switchOrganization: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('worksphere_token');
    const storedOrgId = localStorage.getItem('worksphere_org_id');
    const storedRole = localStorage.getItem('worksphere_role');

    if (token) {
      apiClient<{ user: User; currentOrganizationId: string; currentRole: string; memberships: Membership[] }>('/auth/me')
        .then(data => {
          setUser(data.user);
          setCurrentOrgId(storedOrgId || data.currentOrganizationId);
          setRole(storedRole || data.currentRole);
          setMemberships(data.memberships);
        })
        .catch(() => {
          localStorage.removeItem('worksphere_token');
          localStorage.removeItem('worksphere_org_id');
          localStorage.removeItem('worksphere_role');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, refreshToken: string, orgId: string, userRole: string, userData: User) => {
    localStorage.setItem('worksphere_token', token);
    localStorage.setItem('worksphere_refresh_token', refreshToken);
    localStorage.setItem('worksphere_org_id', orgId);
    localStorage.setItem('worksphere_role', userRole);

    setUser(userData);
    setCurrentOrgId(orgId);
    setRole(userRole);
  };

  const logout = () => {
    localStorage.removeItem('worksphere_token');
    localStorage.removeItem('worksphere_refresh_token');
    localStorage.removeItem('worksphere_org_id');
    localStorage.removeItem('worksphere_role');
    setUser(null);
    setCurrentOrgId(null);
    setRole(null);
    router.push('/login');
  };

  const switchOrganization = (orgId: string) => {
    const mem = memberships.find(m => m.organizationId === orgId);
    if (mem) {
      localStorage.setItem('worksphere_org_id', orgId);
      localStorage.setItem('worksphere_role', mem.role);
      setCurrentOrgId(orgId);
      setRole(mem.role);
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrgId,
        role,
        memberships,
        loading,
        login,
        logout,
        switchOrganization
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
