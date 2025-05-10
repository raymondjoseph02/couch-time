import React from "react";
import { DashBoardLayout } from "../layout/dashboard/dashBoardLayOut";
import { SportLight } from "../components/dashboard/SportLight";
import { Trending } from "../components/dashboard/Trending";
import { ContinueWatching } from "../components/dashboard/ContinueWatching";

function page() {
  return (
    <DashBoardLayout>
      <div className="space-y-8 bg-black scrollbar-thumb-red-500 scrollbar-track-hover:bg-red-400 ">
        <SportLight />
        <Trending />
        <ContinueWatching />
      </div>
    </DashBoardLayout>
  );
}

export default page;
