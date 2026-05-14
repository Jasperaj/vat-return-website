import { Analytics } from '@vercel/analytics/react';
import VatDashboard from "./components/VatDashboard";

export default function App() {
  return (
    <>
      <VatDashboard />
      <Analytics />
    </>
  );
}
