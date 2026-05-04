import { createContext, useContext, useState, type ReactNode } from "react";

export interface UserProfile {
  email: string;
  displayName: string;
  farmName: string;
  avatarInitials: string;
  notifications: boolean;
  language: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login?: (email: string, password: string) => Promise<void>;
  logout?: () => void;
  updateProfile?: (patch: Partial<UserProfile>) => void;
  changePassword?: (current: string, next: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_USER: UserProfile = {
  email: "user@cropeye.local",
  displayName: "CropEye User",
  farmName: "Main Farm",
  avatarInitials: "CU",
  notifications: true,
  language: "en",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);

  const updateProfile = (patch: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...patch }));
  };

  const changePassword = async () => {
    // No-op for no-account mode
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading: false,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
