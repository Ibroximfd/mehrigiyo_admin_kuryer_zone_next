import type { Metadata } from "next";

import { ZonesScreen } from "./zones-screen";

export const metadata: Metadata = { title: "Zonalar" };

export default function ZonesPage() {
  return <ZonesScreen />;
}
