import type { Metadata } from "next";

import { DistrictsScreen } from "./districts-screen";

export const metadata: Metadata = { title: "Tumanlar" };

export default function DistrictsPage() {
  return <DistrictsScreen />;
}
