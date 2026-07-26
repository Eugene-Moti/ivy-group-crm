import Image from "next/image";

export function SubtleBgPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden p-6 text-center">
      <Image
        src="/CRM-integration-processes.webp"
        alt=""
        fill
        className="object-cover opacity-[0.05] dark:opacity-[0.1]"
      />
      <div className="absolute inset-0 bg-background/95" />
      <div className="relative flex flex-col items-center gap-4">{children}</div>
    </div>
  );
}
