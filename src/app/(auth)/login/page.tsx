import Image from "next/image";
import { LoginHero } from "@/components/auth/login-hero";
import { LoginFormPanel } from "@/components/auth/login-form-panel";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar lg:flex">
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
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/55 to-ink/90" />

        <LoginHero />
      </div>

      <div className="relative flex items-center justify-center overflow-hidden p-6 sm:p-10">
        <Image
          src="/CRM-integration-processes.webp"
          alt=""
          fill
          className="object-cover opacity-[0.18] dark:opacity-[0.3]"
        />
        <div className="absolute inset-0 bg-background/75" />

        <LoginFormPanel />
      </div>
    </div>
  );
}
