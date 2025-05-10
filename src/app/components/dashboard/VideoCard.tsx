"use client";
import Image from "next/image";
import dummy_vidoe_image from "@/assets/image/movie-cover-3.png";
import { AddToWatchLaterIcon } from "@/assets/svg/svg";
import { useState } from "react";

export const VideoCard = () => {
  const [isBookMarked, setIsBookeMarked] = useState(false);
  return (
    <div className="rounded-xl">
      <div className="relative select-none">
        <Image alt="" src={dummy_vidoe_image} className="rounded-[20px]" />
        <div
          role="button"
          onClick={() => setIsBookeMarked(!isBookMarked)}
          className={`${
            isBookMarked
              ? "bg-[#5959FF] text-white"
              : "bg-[rgba(2,2,2,0.3)] text-transparent"
          } size-10 rounded-xl  absolute top-5 right-5 flex items-center justify-center transition ease-in-out duration-100`}
        >
          <AddToWatchLaterIcon />
        </div>
      </div>
      <div className="px-3 py-4">
        <p className="text-3xl font-semibold text-white leading-[140%] tracking-[2%]">
          The Beekeeper
        </p>
        <div className="flex gap-4 text-lg font-normal text-white/70">
          <p>2025</p>
          <p>1hr 37 min</p>
        </div>
      </div>
    </div>
  );
};
