import type { ReactNode } from "react";
import TopBar from "./TopBar";
import LeftRail from "./LeftRail";

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
      <div className="mx-auto flex w-full max-w-[1920px] gap-8 py-6 pl-4 pr-8">
        <LeftRail username={username} />
        <main className={`mx-auto w-full flex-1 ${wide ? "max-w-[896px]" : "max-w-2xl"}`}>{children}</main>
      </div>
    </>
  );
}
