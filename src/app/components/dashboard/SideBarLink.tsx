import {
  BookMarkIcon,
  HomeIcon,
  PolygonIcon,
  SearchIcon,
  SettingIcon,
  UserIcon,
  WatchIcon,
} from "@/assets/svg/svg";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const SideBarLink = () => {
  const [activeLink, setActiveLink] = useState(() => {
    const storeActiveLink = localStorage.getItem("activeLink");
    if (storeActiveLink) {
      return storeActiveLink;
    }
    return "Dashboard";
  });
  const links = [
    {
      linkName: "Dashboard",
      icon: <HomeIcon />,
      action: () => {
        setActiveLink("Dashboard");
      },
    },
    {
      linkName: "Watched",
      icon: <WatchIcon />,
      action: () => {
        setActiveLink("Watched");
      },
    },
    {
      linkName: "Bookmark",
      icon: <BookMarkIcon />,
      action: () => {
        setActiveLink("Bookmark");
      },
    },
    {
      linkName: "Search",
      icon: <SearchIcon />,
      action: () => {
        setActiveLink("Search");
      },
    },
    {
      linkName: "Setting",
      icon: <SettingIcon />,
      action: () => {
        setActiveLink("Setting");
      },
    },
    {
      linkName: "Account",
      icon: <UserIcon />,
      action: () => {
        setActiveLink("Account");
      },
    },
  ];
  useEffect(() => {
    console.log(activeLink);
  }, [activeLink]);
  return (
    <nav className="flex flex-col items-center justify-center gap-5">
      {links.map((link, index) => {
        const isActive =
          link.linkName.toLocaleLowerCase() === activeLink.toLocaleLowerCase();
        return (
          <div className="relative p-3 cursor-pointer group" key={index}>
            {link.linkName.toLocaleLowerCase() ===
              "search".toLocaleLowerCase() && (
              <div className="px-2 py-0.5 bg-[#5959FF] absolute -right-2 z-20 rounded text-[10px] text-white">
                K
              </div>
            )}
            {/* tooltip */}
            <dialog
              // role="tooltip"
              className="hidden group-hover:flex z-[99999] left-[110%] absolute py-1 px-3 rounded-[10px] bg-white text-base font-normal text-[#030306] top-1/2 -translate-y-1/2 appearance-none"
            >
              {link.linkName}
              <div className="absolute -left-[8px] top-1/2 -translate-y-1/2">
                <PolygonIcon />
              </div>
            </dialog>

            {/* icon */}
            <span
              role="link"
              aria-roledescription="navigation link"
              onClick={link.action}
              className={` relative z-20 transition duration-100 ease-in-out ${
                isActive ? "text-[#FFFFFF]" : "text-[#535361]"
              }`}
            >
              {link.icon}
            </span>

            {/* active background */}
            {isActive && (
              <motion.div
                layout="position"
                id="activeLink"
                layoutId="activeLink"
                className="absolute size-full bg-[#181833] inset-0 rounded-[14px] z-10"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
};
