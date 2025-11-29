import { getCurrentUser } from "@/lib/actions/user";
import HomeClient from "@/components/home/home";

export interface Source {
  id: number;
  name: string;
  addedAt: Date;
}

interface PageProps {
  params: Promise<{ id?: string[] }>;
}
export default async function Home( { params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  
  const chatId = id?.[0] ?? null;

  return <HomeClient user={user} chatId={chatId} />;

}
