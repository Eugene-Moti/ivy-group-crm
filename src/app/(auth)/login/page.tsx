import Image from "next/image";
import { LoginFormPanel } from "@/components/auth/login-form-panel";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#040910] p-4 sm:p-8">
      <video
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        autoPlay
        muted
        loop
        playsInline
        poster="/ivy-myst-poster.jpg"
      >
        <source src="/ivy-myst-bg.webm" type="video/webm" />
        <source src="/ivy-myst-bg.mp4" type="video/mp4" />
      </video>
      {/* eslint-disable-next-line @next/next/no-img-element -- static poster fallback for prefers-reduced-motion, not a candidate for next/image optimization */}
      <img
        src="/ivy-myst-poster.jpg"
        alt=""
        className="absolute inset-0 hidden h-full w-full object-cover motion-reduce:block"
      />

      <Image
        src="/CRM-integration-processes.webp"
        alt=""
        fill
        className="object-cover opacity-40 mix-blend-screen blur-3xl"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-[#03070d]/85 via-[#050d16]/55 to-[#03070d]/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_15%,rgba(56,189,248,0.18),transparent_70%)]" />

      <LoginFormPanel />
    </div>
  );
}
