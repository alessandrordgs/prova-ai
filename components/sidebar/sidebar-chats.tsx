import { useState } from "react";
import NewChat from "../chats/new-chat";

interface sideBarProps{
  sidebarOpen: boolean;
  chatHistory: Array<{
    id: number;
    title: string;
    lastMessage: string;
    date: Date;
  }>;
}
export default function SidebarChats({ sidebarOpen, chatHistory }: sideBarProps) {
  const [newChatOpen, setNewChatOpen] = useState(false);
  return (
    <aside
      className={`${sidebarOpen ? "w-72" : "w-0"
        } shrink-0 overflow-hidden border-r-4 border-black bg-white transition-all duration-300`}
    > 
      <div className="flex h-full w-72 flex-col">
        <div className="border-b-3 border-black p-4" style={{ borderBottomWidth: "3px" }}>
          <button onClick={() => setNewChatOpen(!newChatOpen)} className="flex w-full items-center justify-center gap-2 border-3 border-black bg-black py-3 font-['Space_Mono'] text-sm font-bold uppercase text-white transition-all hover:bg-white hover:text-black"
            style={{ borderWidth: "3px" }}>
            <span className="text-lg">+</span> Novo Chat
          </button>
        </div>
        <NewChat open={newChatOpen} openChange={() => setNewChatOpen(!newChatOpen)} />

        <div className="border-b-3 border-dashed border-black p-3" style={{ borderBottomWidth: "3px" }}>
          <h2 className="font-['Playfair_Display'] text-lg font-bold uppercase">
             Histórico
          </h2>
          <p className="mt-1 font-['Space_Mono'] text-xs text-gray-600">
            Conversas anteriores
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className="group flex cursor-pointer items-start gap-2 border-3 border-black bg-[#f5f5f0] p-3 transition-all hover:bg-black hover:text-white"
                style={{ borderWidth: "3px" }}
              >
                <span className="text-lg">💬</span>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-['Space_Mono'] text-sm font-medium">
                    {chat.title}
                  </p>
                  <p className="truncate font-['Space_Mono'] text-xs text-gray-500 group-hover:text-gray-300">
                    {chat.lastMessage}
                  </p>
                  <p className="mt-1 font-['Space_Mono'] text-[10px] text-gray-400 group-hover:text-gray-400">
                    {chat.date.toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t-3 border-black p-3" style={{ borderTopWidth: "3px" }}>
          <p className="text-center font-['Space_Mono'] text-[10px] uppercase text-gray-500">
            © 2025 provaAI
          </p>
        </div>
      </div>
    </aside>
  )
}