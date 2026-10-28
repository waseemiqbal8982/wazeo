"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { AdminPayments } from "@/components/admin/AdminPayments";
import { AdminPaymentMethods } from "@/components/admin/AdminPaymentMethods";

export default function PaymentsPage() {
  const [tab, setTab] = useState("deposits");

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { id: "deposits", label: "Deposits" },
          { id: "methods", label: "Payment Methods" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "deposits" ? <AdminPayments /> : <AdminPaymentMethods />}
    </div>
  );
}
