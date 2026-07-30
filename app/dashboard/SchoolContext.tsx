"use client";

import { createContext, useContext } from "react";

type SchoolInfo = {
  id: string;
  name: string;
  logoUrl: string | null;
} | null;

type DashboardMeta = {
  school: SchoolInfo;
  avatarUrl: string | null;
};

const DashboardMetaContext = createContext<DashboardMeta>({ school: null, avatarUrl: null });

export function SchoolProvider({
  school,
  avatarUrl,
  children,
}: {
  school: SchoolInfo;
  avatarUrl: string | null;
  children: React.ReactNode;
}) {
  return (
    <DashboardMetaContext.Provider value={{ school, avatarUrl }}>
      {children}
    </DashboardMetaContext.Provider>
  );
}

export function useSchoolInfo() {
  return useContext(DashboardMetaContext).school;
}

export function useUserAvatar() {
  return useContext(DashboardMetaContext).avatarUrl;
}
