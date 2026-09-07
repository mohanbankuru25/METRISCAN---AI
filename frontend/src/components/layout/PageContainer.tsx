import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface PageContainerProps {
  children: React.ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main-wrapper">
        <Topbar />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
