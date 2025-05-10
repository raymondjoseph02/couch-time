import { CouchTimeLogo, LogOut } from "@/assets/svg/svg";
import { SideBarLink } from "./SideBarLink";

export const SideBar = () => {
  return (
    <aside className="flex flex-col justify-between bg-[#0B0B17] h-screen  max-w-25 py-6 items-center">
      <div className="flex w-full h-full flex-col">
        <div className="gap-1 flex-col flex py-4 px-4 items-center justify-center border-b border-[#FFFFFF1F]">
          <CouchTimeLogo />
          <p className="text-base font-normal leading-[100%] bg-gradient-to-l from-[#DB3422] to-[#EF7823] bg-clip-text text-transparent">
            Couch
          </p>
        </div>
        <div className="flex justify-between flex-col items-center   pt-16 px-1  grow-1">
          <div>
            <SideBarLink />
          </div>
          <div>
            <LogOut />
          </div>
        </div>
      </div>
    </aside>
  );
};
