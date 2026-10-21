import type { Metadata } from "next";

import { CouriersScreen } from "./couriers-screen";

export const metadata: Metadata = { title: "Kuryerlar" };

export default function CouriersPage() {
  return <CouriersScreen />;
}
