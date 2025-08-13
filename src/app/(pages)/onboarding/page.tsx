import { redirect } from "next/navigation";

export default function OnboardingPage() {
  // Redirect to step 1
  redirect("/onboarding/step-1");
}
