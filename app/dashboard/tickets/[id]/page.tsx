import { TicketChat } from "@/components/tickets/TicketChat";

export const metadata = { title: "Ticket" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketChat id={id} />;
}
