import { OrderDetail } from "@/components/orders/OrderDetail";

export const metadata = { title: "Order" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
