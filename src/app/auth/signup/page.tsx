import { AuthFooter } from "@/app/components/auth/AuthFooter";
import { AuthHeader } from "@/app/components/auth/AuthHeader";
import { Divider } from "@/app/components/auth/Divider";
import { SignUpForm } from "@/app/components/auth/SignUpForm";
import { SocialLoginButtons } from "@/app/components/auth/SocialLoginButtons";
import { AuthLayout } from "@/app/layout/auth/signIn";
import React from "react";

function page() {
  return (
    <AuthLayout>
      <div className="rounded-2xl p-8 space-y-10 bg-gray-700 max-w-xl">
        <AuthHeader text="Create a new account" />

        <div className="space-y-5">
          <SocialLoginButtons />
          <Divider text="or create with" />
          <SignUpForm />
          <AuthFooter
            link="../../auth/signin"
            linkText="Sign In"
            text="Already have an account?"
          />
        </div>
      </div>
    </AuthLayout>
  );
}

export default page;
