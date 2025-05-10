"use client";
import { AuthProps } from "@/app/type/type";
import bg from "../../../assets/image/auth_bg.webp";
// import { getCookies } from "cookies-next/client";
// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
export const AuthLayout = ({ children }: AuthProps) => {
  //   const route = useRouter();
  //   const token = getCookies("token");
  //   useEffect(() => {
  //     if (token) {
  //       route.push("/dashboard");
  //     }
  //   }, [route, token]);
  //   if (token) return null;
  return (
    <div
      style={{
        backgroundImage: `url(${bg.src})`,
      }}
      className="relative h-screen w-screen bg-fixed bg-cover bg-no-repeat bg-center flex justify-center items-center"
    >
      <div className="w-full  flex items-center justify-center pt-20 px-5 py-8 h-screen">
        {children}
      </div>
    </div>
  );
};
