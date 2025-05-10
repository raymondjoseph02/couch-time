"use client";
import {
  createContext,
  FC,
  useState,
  Dispatch,
  SetStateAction,
  useContext,
} from "react";
import { UserProps, AuthProps } from "@/app/type/type";

// Define the context shape
interface AuthContextType {
  user: UserProps | undefined;
  setUser: Dispatch<SetStateAction<UserProps | undefined>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<AuthProps> = ({ children }) => {
  const [user, setUser] = useState<UserProps>();

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

//  custom hook for cleaner usage
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
