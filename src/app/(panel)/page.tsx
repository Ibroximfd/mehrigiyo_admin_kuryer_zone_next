import type { Metadata } from "next";

import { OverviewScreen } from "./_overview/overview-screen";

export const metadata: Metadata = { title: "Umumiy" };

export default function OverviewPage() {
  return <OverviewScreen />;
}
