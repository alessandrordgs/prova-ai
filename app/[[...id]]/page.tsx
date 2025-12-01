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
  
  let chatId: string | null = null;
  if (id && id.length > 0) {
    if (id[0] === "chats" && id.length > 1) {
      chatId = id[1];
    } else if (id[0] !== "chats") {
      chatId = id[0];
    }
  }

  return <HomeClient user={user} chatId={chatId} />;

}
