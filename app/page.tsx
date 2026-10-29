import { getHomeData } from "@/lib/home-data";
import { HomePage } from "@/components/landing/HomePage";
import { EMPTY_HOME } from "@/lib/home-empty";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let data;
  try {
    data = await getHomeData();
  } catch {
    data = EMPTY_HOME;
  }
  return <HomePage data={data} />;
}
