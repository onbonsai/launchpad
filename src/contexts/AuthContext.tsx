import { createContext, useContext, useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { lensClient } from "@src/services/lens/client";
import { useLensLogin, logout as lensLogout } from "@src/hooks/useLensLogin";

type AuthContextType = {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  isLensLoggedIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  const { refetch: login, isPending } = useLensLogin();
  const { disconnect: walletDisconnect } = useDisconnect();

  const [isLensLoggedIn, setIsLensLoggedIn] = useState(false);

  useEffect(() => {
    const checkLensLogin = async () => {
      const session = await lensClient.resumeSession();
      if (session) {
        setIsLensLoggedIn(true);
      }
    };
    checkLensLogin();
  }, []);

  const handleLogin = async () => {
    if (!isConnected) return;
    await login();
    setIsLensLoggedIn(true);
  };

  const handleLogout = async () => {
    await lensLogout();
    walletDisconnect();
    setIsLensLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        isDisconnected,
        isLensLoggedIn,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
