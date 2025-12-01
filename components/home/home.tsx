"use client";

import { Chat } from "@/components/chats/chat";
import SidebarChats from "@/components/sidebar/sidebar-chats";
import SidebarSources from "@/components/sidebar/sidebar-sources";
import Username from "@/components/username/username";
import { useEffect, useState } from "react";
import { User } from "@/generated/prisma/client";
import { toast } from "sonner";

interface ChatHistory {
  id: string;
  title: string;
  lastMessage: string;
  date: Date;
}

interface HomeClientProps {
  user: User | null;
  chatId: string | null;
}

export default function HomeClient({ user, chatId }: HomeClientProps) {
  const [usernameOpen, setUsernameOpen] = useState(!user);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sourcesCount, setSourcesCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/chats", { method: "GET", cache: "no-store" });
        if (!res.ok) return;
        const chats: Array<{ id: string; name: string; banca: string | null; createdAt: string }> = await res.json();
        const mapped: ChatHistory[] = chats.map((chat) => ({
          id: chat.id,
          title: chat.name,
          lastMessage: `Banca: ${chat.banca ?? "N/A"}`,
          date: new Date(chat.createdAt),
        }));
        setChatHistory(mapped);
      } catch {
        toast.error("Erro ao carregar histórico de chats.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!chatId) return;

    (async () => {
      try {
        const res = await fetch(`/api/pdf?chatId=${chatId}`);
        if (res.ok) {
          const sources = await res.json();
          setSourcesCount(sources.length);
        }
      } catch {
        console.error("Erro ao carregar count de sources");
      }
    })();
  }, [chatId]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f5f5f0]">
      <Username
        open={usernameOpen}
        openChange={setUsernameOpen}
      />
      <header className="z-10 border-b-4 border-black bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-10 w-10 items-center justify-center border-3 border-black bg-white text-lg transition-all hover:bg-black hover:text-white"
              style={{ borderWidth: "3px" }}
            >
              ☰
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center border-3 border-black bg-black text-white"
                style={{ borderWidth: "3px" }}>
                <span className="font-['Playfair_Display'] text-lg font-black">P</span>
              </div>
              <h1 className="font-['Playfair_Display'] text-xl font-black uppercase tracking-tight md:text-2xl">
                prova<span className="bg-black px-1 text-white">AI</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden border-3 border-black px-3 py-1 font-['Space_Mono'] text-xs uppercase md:block"
              style={{ borderWidth: "3px" }}>
              {user?.username ?? "Convidado"}
            </span>
            <span className="hidden border-3 border-black px-3 py-1 font-['Space_Mono'] text-xs uppercase md:block"
              style={{ borderWidth: "3px" }}>
              {sourcesCount} fonte{sourcesCount !== 1 ? "s" : ""}
            </span>
            <div className="h-3 w-3 rounded-full border-2 border-black bg-green-500"></div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SidebarChats
          sidebarOpen={sidebarOpen}
          chatHistory={chatHistory}
        />

        <Chat chatId={chatId} />

        <SidebarSources chatId={chatId} />
      </div>
    </div>
  );
}
