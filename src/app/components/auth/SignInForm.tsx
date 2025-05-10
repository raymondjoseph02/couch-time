"use client";
import { EyeOff, EyeOn } from "@/assets/svg/svg";
import { useState } from "react";

export const SignInForm = () => {
  // const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
  //   useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  // const handleConfirmPasswordVisibility = () => {
  //   setIsConfirmPasswordVisible(!isConfirmPasswordVisible);
  // };
  const handlePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <div className="">
      <form className="space-y-4">
        <div className="control-form">
          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter email"
          />
        </div>
        <div className="control-form">
          <label htmlFor="password">Password </label>
          <div className="w-full relative">
            <input
              type={isPasswordVisible ? "text" : "password"}
              id="password"
              name="password"
              placeholder="Enter pasword"
            />
            <span
              aria-label="password visibility button"
              role="button"
              onClick={handlePasswordVisibility}
              className="absolute top-1/2 -translate-1/2  w-fit h-fit right-4"
            >
              {isPasswordVisible ? <EyeOn /> : <EyeOff />}
            </span>
          </div>
        </div>
        {/* <div className="control-form">
          <label htmlFor="confirmPassword"> Confirm Password </label>
          <div className="relative w-full">
            <input
              type={isConfirmPasswordVisible ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              placeholder=" confirm Password"
            />
            <span
              aria-label="comnfirm password visibility button"
              role="button"
              onClick={handleConfirmPasswordVisibility}
              className="absolute top-1/2 -translate-1/2  w-fit h-fit right-4"
            >
              {isConfirmPasswordVisible ? <EyeOn /> : <EyeOff />}
            </span>
          </div>
        </div> */}
        <div className="pt-9">
          <button type="submit" className="button--primary button">
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
};
