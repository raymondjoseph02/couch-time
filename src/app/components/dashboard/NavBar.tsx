import { useState } from "react";
import { motion } from "framer-motion";
import couch_bg from "@/assets/image/couch_logo.webp";
import { CategoryDialog } from "../common/CategoryDialog";
export const NavBar = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [isCategory, setIsCategory] = useState(false);
  const tabs = [
    {
      tabName: "All",
      action: () => {
        setActiveTab("All");
        if (isCategory) {
          setIsCategory(!isCategory);
        }
      },
    },
    {
      tabName: "Comedy",
      action: () => {
        setActiveTab("Comedy");
        if (isCategory) {
          setIsCategory(!isCategory);
        }
      },
    },
    {
      tabName: "Fantasy",
      action: () => {
        setActiveTab("Fantasy");
        if (isCategory) {
          setIsCategory(!isCategory);
        }
      },
    },
    {
      tabName: "Drama",
      action: () => {
        setActiveTab("Drama");
        if (isCategory) {
          setIsCategory(!isCategory);
        }
      },
    },
    {
      tabName: "History",
      action: () => {
        setActiveTab("History");
        if (isCategory) {
          setIsCategory(!isCategory);
        }
      },
    },
    {
      tabName: "Horror",
      action: () => {
        setActiveTab("Horror");
        if (isCategory) {
          setIsCategory(!isCategory);
        }
      },
    },
  ];
  const openCategoryDialog = () => {
    setIsCategory(!isCategory);
  };
  return (
    <header
      style={{
        backgroundImage: `url(${couch_bg.src})`,
        backgroundSize: "14rem",
        // backgroundPosition: "20px",
        backgroundPositionX: "calc(100% - 30px)",
        backgroundPositionY: "0px",
      }}
      className="space-y-8 bg-no-repeat  fixed  pb-5 z-100 w-full sm:w-[calc(100vw-100px)] bg-[#030306] left-0 sm:left-25 px-4 xs:pl-5 top-0 pt-16"
    >
      <div>
        <h1 className="text-4xl font-semibold text-white">My cinema</h1>
      </div>
      <div className="hidden gap-3 sm:flex">
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
      <div className="flex items-center gap-5">
        <div>
          <div
            role="tab"
            // onClick={}
            className=" px-5 py-2 cursor-pointer w-fit bg-gradient-to-l from-[#DB3422] to-[#EF7823] rounded-xl"
          >
            <span className="relative z-20 text-white"> {activeTab}</span>
          </div>
        </div>
        <div
          role="button"
          onClick={openCategoryDialog}
          className="px-6 py-2 text-white border border-gray-200 rounded-full"
        >
          category
        </div>
        <CategoryDialog
          isOpen={isCategory}
          handleClose={openCategoryDialog}
          categories={tabs}
        />
      </div>
    </header>
  );
};
