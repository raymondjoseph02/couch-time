import { FC } from "react";

interface AuthFooterProps {
  link: string;
  linkText: string;
  text: string;
  isProtected?: boolean;
}
export const AuthFooter: FC<AuthFooterProps> = ({
  link,
  linkText,
  text,
  isProtected = false,
}) => {
  return (
    <div className="text-center space-y-2 pt-8">
      <div>
        <p className="text-sm font-normal text-[#DCDFEA]">
          <span>{text}</span>
          <a href={link} className="font-medium text-[#F9FAFB] pl-2">
            {linkText}
          </a>
        </p>
      </div>
      {isProtected && (
        <div>
          <p className="text-xs italic text-gray-250">
            Protected by Google reCAPTCHA
          </p>
        </div>
      )}
    </div>
  );
};
