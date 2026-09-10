import Image from "next/image";

/** The login page's glass-card look, without the video — for the 2FA verify / enrol steps. */
export function AuthStepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#040910] p-4 sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_15%,rgba(56,189,248,0.16),transparent_70%)]" />
      <div className="dark relative w-full max-w-sm space-y-6 rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-foreground shadow-2xl shadow-black/50 backdrop-blur-2xl sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/ivy-group-logo-full.png"
            alt="The Ivy Group"
            width={640}
            height={640}
            className="h-12 w-12 object-contain"
            priority
          />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
