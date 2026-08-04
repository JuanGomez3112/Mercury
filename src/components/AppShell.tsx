import type { ReactNode } from "react";
import TopBar from "./TopBar";
import LeftRail from "./LeftRail";
import MobileNav from "./MobileNav";

/** Marco común: TopBar + rail vertical persistente + contenido centrado. */
export default function AppShell({
  username,
  avatarUrl,
  children,
  wide = false,
}: {
  username: string;
  avatarUrl?: string | null;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <TopBar username={username} avatarUrl={avatarUrl} />
      <div className="mx-auto flex w-full max-w-[1920px] gap-8 px-0 py-4 pb-20 sm:py-6 lg:pb-6 lg:pl-4 lg:pr-8">
        <LeftRail username={username} />
        <main className={`mx-auto w-full flex-1 ${wide ? "max-w-[896px]" : "max-w-2xl"}`}>{children}</main>
      </div>
      <MobileNav />
    </>
  );
}
