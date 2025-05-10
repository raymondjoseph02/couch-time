"use client";
import {
  GoogleIcon,
  MetaMaskBarge,
  PhantomLogo,
  StarknetLogo,
} from "@/assets/svg/svg";
// import { useAuth } from "@/context/AuthContext";
// import { auth } from "@/lib/firebase";
// import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
// import { useRouter } from "next/navigation";
// import Cookies from "js-cookie";

export const SocialLoginButtons = () => {
  //   const provider = new GoogleAuthProvider();
  //   const { setUser } = useAuth();
  //   const router = useRouter();

  //   const handleGoogleSignIn = async () => {
  //     try {
  //       const userCredentials = await signInWithPopup(auth, provider);
  //       const token = await userCredentials.user.getIdToken();
  //       const email = userCredentials.user.email;
  //       console.log(token);

  //       setUser({
  //         userId: token,
  //         email: email,
  //         authType: "firebase",
  //       });
  //       Cookies.set("token", token);
  //       router.push("/dashboard");
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   };
  return (
    <div className="flex justify-between items-center gap-3 md:min-w-lg flex-col sm:flex-row">
      <button
        // onClick={handleGoogleSignIn}
        className="py-2 px-4 border border-blue_gray-100 shadow-[0px_1px_2px_0px] shadow-[#1018280D] flex  rounded-lg w-full items-center justify-center text-white gap-3 font-medium"
      >
        <GoogleIcon />
        <span>Google</span>
      </button>
      <button className="py-2 px-4 border border-blue_gray-100 shadow-[0px_1px_2px_0px] shadow-[#1018280D] flex  rounded-lg w-full items-center justify-center text-white gap-3 font-medium">
        <span className="">Connect Wallet</span>
        <div className="hidden xs:block">
          <MetaMaskBarge />
        </div>
        <div className="hidden xs:block md:hidden lg:block">
          <StarknetLogo />
        </div>
        <div className="hidden lg:block">
          <PhantomLogo />
        </div>
      </button>
    </div>
  );
};
