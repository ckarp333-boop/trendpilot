import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "Brand profile" };

export default function ProfilePage() {
  return <ProfileForm />;
}
