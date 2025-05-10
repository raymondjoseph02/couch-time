import { CouchTimeLogo } from "@/assets/svg/svg";
import { FC } from "react";
interface AuthHeaderProps {
  text: string;
}
export const AuthHeader: FC<AuthHeaderProps> = ({ text }) => {
  return (
    <div>
      <CouchTimeLogo />
      <h2>{text}</h2>
    </div>
  );
};
