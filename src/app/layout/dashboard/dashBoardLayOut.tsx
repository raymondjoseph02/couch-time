"use client";

import { NavBar } from "@/app/components/dashboard/NavBar";
import { SideBar } from "@/app/components/dashboard/SideBar";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import Cookies from "js-cookie";
import { AuthProps } from "@/app/type/type";

export const DashBoardLayout = ({ children }: AuthProps) => {
  //   const router = useRouter();
  //   const [tokenExists, setTokenExists] = useState<boolean | null>(null);

  //   useEffect(() => {
  //     const token = Cookies.get("token");
  //     if (!token) {
  //       router.push("/auth/signup");
  //     } else {
  //       setTokenExists(true);
  //     }
  //   }, [router]);

  //   if (tokenExists === null) return null; // Wait for token check

  return (
    <div className="flex bg-black scrollbar">
      <div className="fixed hidden sm:block z-1000">
        <SideBar />
      </div>
      <div className="pt-62  px-4 sm:px-8 pb-5  space-y-8 bg-[#030306] grow sm:ml-23 scrollbar scrollbar-track-green-400 scrollbar-thumb-red-300">
        <NavBar />
        {children}
      </div>
    </div>
  );
};
