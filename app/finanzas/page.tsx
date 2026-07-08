import type { Metadata } from "next";
import FinanzasApp from "./components/FinanzasApp";

export const metadata: Metadata = {
  title: "Finanzas · Familia",
  description: "Patrimonio, DAP, Fintual y caja casa",
};

export default function FinanzasPage() {
  return <FinanzasApp />;
}
