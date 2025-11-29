import { getCurrentUser } from "@/lib/actions/user";
import HomeClient from "@/components/home/home";

export interface Source {
  id: number;
  name: string;
  addedAt: Date;
}

export default async function Home() {
  const user = await getCurrentUser();

  return <HomeClient user={user} />;
}
