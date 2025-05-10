import { useState } from "react";
import { motion } from "framer-motion";
import couch_bg from "@/assets/image/couch_logo.webp";

export const NavBar = () => {
  const [activeTab, setActiveTab] = useState("All");
  const tabs = [
    {
      tabName: "All",
      action: () => {
        setActiveTab("All");
      },
    },
    {
      tabName: "Comedy",
      action: () => {
        setActiveTab("Comedy");
      },
    },
    {
      tabName: "Fantasy",
      action: () => {
        setActiveTab("Fantasy");
      },
    },
    {
      tabName: "Drama",
      action: () => {
        setActiveTab("Drama");
      },
    },
    {
      tabName: "History",
      action: () => {
        setActiveTab("History");
      },
    },
    {
      tabName: "Horror",
      action: () => {
        setActiveTab("Horror");
      },
    },
  ];
  return (
    <header
      style={{
        backgroundImage: `url(${couch_bg.src})`,
        backgroundSize: "14rem",
        // backgroundPosition: "20px",
        backgroundPositionX: "calc(100% - 30px)",
        backgroundPositionY: "0px",
      }}
      className="space-y-8 bg-no-repeat  fixed  pb-5 z-100 w-[calc(100vw-100px)] bg-[#030306] left-25 pl-5 top-0 pt-16"
    >
      <div>
        <h1 className="text-4xl font-semibold text-white">My cinema</h1>
      </div>
      <div className="flex gap-3">
        {tabs.map((tab, index) => {
          const isActive =
            activeTab.toLocaleLowerCase() === tab.tabName.toLocaleLowerCase();
          return (
            <div
              key={index}
              role="tab"
              onClick={tab.action}
              className="relative px-5 py-2 cursor-pointer"
            >
              <span className="relative z-20 text-white"> {tab.tabName}</span>
              {isActive && (
                <motion.div
                  layout="preserve-aspect"
                  id="active-tab"
                  layoutId="active-tab"
                  className="absolute inset-0 size-full bg-gradient-to-l from-[#DB3422] to-[#EF7823] rounded-xl   z-10"
                />
              )}
            </div>
          );
        })}
      </div>
    </header>
  );
};
