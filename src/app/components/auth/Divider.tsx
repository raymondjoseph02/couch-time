import { FC } from "react";

interface DividerProps {
  text: string;
}
export const Divider: FC<DividerProps> = ({ text }) => {
  return (
    <div className="flex items-center justify-center">
      <div className=" h-[1px] bg-[#4A5578] flex-1" />
      <p className="px-2 w-fit text-[#B9C0D4] text-xs font-medium text-center">
        {text}
      </p>
      <div className="flex-1 h-[1px] bg-[#4A5578]" />
    </div>
  );
};
