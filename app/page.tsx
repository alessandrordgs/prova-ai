"use client";

import { Chat } from "@/components/chats/chat";
import SidebarChats from "@/components/sidebar/sidebar-chats";
import SidebarSources from "@/components/sidebar/sidebar-sources";
import { useState } from "react";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export interface Source {
  id: number;
  name: string;
  addedAt: Date;
}

interface ChatHistory {
  id: number;
  title: string;
  lastMessage: string;
  date: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Olá! Eu sou o provaAI. Adicione fontes na barra lateral e faça perguntas sobre elas. Posso ajudá-lo a estudar, resumir conteúdos e criar questões de prova!",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [sources, setSources] = useState<Source[]>([
    { id: 1, name: "Apostila de Matemática.pdf", addedAt: new Date() },
    { id: 2, name: "Notas de Aula - História", addedAt: new Date() },
  ]);
  const [chatHistory] = useState<ChatHistory[]>([
    { id: 1, title: "Questões de Matemática", lastMessage: "Gere 5 questões sobre...", date: new Date("2025-11-28") },
    { id: 2, title: "Resumo de História", lastMessage: "Faça um resumo do...", date: new Date("2025-11-27") },
    { id: 3, title: "Conceitos de Física", lastMessage: "Explique a lei de...", date: new Date("2025-11-26") },
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(true);



  const handleRemoveSource = (id: number) => {
    setSources(sources.filter((s) => s.id !== id));
  };

  const suggestedActions = [
    { icon: "", label: "Criar resumo", action: "Crie um resumo das fontes" },
    { icon: "", label: "Gerar questões", action: "Gere questões de prova" },
    { icon: "", label: "Explicar conceito", action: "Explique os principais conceitos" },
    { icon: "", label: "Tópicos-chave", action: "Liste os tópicos-chave" },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f5f5f0]">
      {/* Header */}
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
              {sources.length} fontes
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

       <Chat
          messages={messages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          suggestedActions={suggestedActions}
        />


        <SidebarSources
          sources={sources}
          handleRemoveSource={handleRemoveSource}
        />
      </div>
    </div>
  );
}
