import { AuthFooter } from "@/app/components/auth/AuthFooter";
import { AuthHeader } from "@/app/components/auth/AuthHeader";
import { Divider } from "@/app/components/auth/Divider";
import { SignInForm } from "@/app/components/auth/SignInForm";
import { SocialLoginButtons } from "@/app/components/auth/SocialLoginButtons";
import { AuthLayout } from "@/app/layout/auth/signIn";
import React from "react";

function page() {
  return (
    <AuthLayout>
      <div className="rounded-2xl p-8 space-y-10 bg-gray-700 max-w-xl">
        <AuthHeader text="Sign In to your account" />

        <div className="space-y-5">
          <SocialLoginButtons />
          <Divider text="or continue with" />
          <SignInForm />
          <AuthFooter
            linkText=" Create One"
            link="../../auth/signup"
            text="Don’t have an account?"
            isProtected={true}
          />
        </div>
      </div>
    </AuthLayout>
  );
}

export default page;
