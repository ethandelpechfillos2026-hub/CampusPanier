import { ReactNode } from "react";
import Footer from "@/components/Footer";

interface PhoneFrameProps {
  children: ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="phone-frame">
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </div>
  );
}
