import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface ChatProps {
  chatId: string | null;
  initialMessages?: Message[];
}

export function Chat({ chatId, initialMessages = [] }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedActions = [
    { icon: "📝", label: "Simulado da banca", action: "Gerar 10 questões no estilo da banca selecionada" },
    { icon: "📋", label: "Resumo por edital", action: "Resumir cada tópico do conteúdo programático" },
    { icon: "📅", label: "Plano de estudo", action: "Montar plano semanal até a prova com metas" },
    { icon: "🔍", label: "Perfil da banca", action: "Analisar temas mais cobrados e pegadinhas recorrentes" },
  ];

  useEffect(() => {
    if (!chatId) return;
    
    (async () => {
      try {
        const res = await fetch(`/api/chat?chatId=${chatId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(
            data.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              createdAt: new Date(m.createdAt),
            }))
          );
        }
      } catch {
        console.error("Erro ao carregar mensagens");
      }
    })();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !chatId || isLoading) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: inputValue,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Mensagem do assistente "em construção"
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: userMessage.content }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Erro ao enviar mensagem");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantContent = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          assistantContent += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: assistantContent }
                : msg
            )
          );
        }
      }
      // Opcional: pode buscar a mensagem "final" do backend para garantir id/campos corretos
    } catch (error) {
      console.error(error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content:
                  "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const welcomeMessage: Message = {
    id: "welcome",
    role: "assistant",
    content:
      "Olá! Eu sou o provaAI. Foque seus estudos para concursos: adicione editais, leis e materiais na barra lateral, e faça perguntas sobre a banca, o conteúdo programático e resoluções de questões. Posso gerar simulados no estilo da banca, resumir por tópico do edital e montar planos de estudo.",
    createdAt: new Date(),
  };

  const displayMessages = messages.length === 0 ? [welcomeMessage] : messages;

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {!chatId && (
            <div className="border-3 border-black bg-yellow-50 p-4 font-['Space_Mono'] text-sm text-center" style={{ borderWidth: "3px" }}>
              Crie ou selecione um chat para começar a conversar.
            </div>
          )}

          {displayMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] ${
                  message.role === "user"
                    ? "border-3 border-black bg-black p-4 text-white shadow-[-3px_3px_0px_#666]"
                    : "border-3 border-black bg-white p-4 shadow-[3px_3px_0px_#000]"
                }`}
                style={{ borderWidth: "3px" }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center border-2 border-current text-xs ${
                      message.role === "user" ? "bg-white text-black" : "bg-black text-white"
                    }`}
                  >
                    {message.role === "user" ? "U" : "P"}
                  </span>
                  <span className="font-['Playfair_Display'] text-sm font-bold uppercase">
                    {message.role === "user" ? "Você" : "provaAI"}
                  </span>
                  <span
                    className={`font-['Space_Mono'] text-xs ${
                      message.role === "user" ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    {message.createdAt.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="font-['Space_Mono'] text-sm leading-relaxed md:text-base whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div
                className="border-3 border-black bg-white p-4 shadow-[3px_3px_0px_#000]"
                style={{ borderWidth: "3px" }}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center border-2 border-current bg-black text-white text-xs">
                    P
                  </span>
                  <span className="font-['Playfair_Display'] text-sm font-bold uppercase">
                    provaAI
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 font-['Space_Mono'] text-sm">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse delay-100">●</span>
                  <span className="animate-pulse delay-200">●</span>
                  <span className="ml-2">Pensando...</span>
                </div>
              </div>
            </div>
          )}

          {messages.length === 0 && chatId && (
            <div className="mt-8">
              <p className="mb-4 text-center font-['Playfair_Display'] text-lg font-bold uppercase">
                Sugestões
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {suggestedActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(action.action)}
                    className="flex flex-col items-center gap-2 border-3 border-black bg-white p-4 font-['Space_Mono'] transition-all hover:bg-black hover:text-white hover:shadow-[3px_3px_0px_#666]"
                    style={{ borderWidth: "3px" }}
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <span className="text-xs uppercase">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t-4 border-black bg-white p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3">
            <div className="relative flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={chatId ? "Pergunte algo sobre suas fontes..." : "Selecione um chat primeiro..."}
                disabled={!chatId || isLoading}
                rows={2}
                className="w-full resize-none border-3 border-black bg-[#f5f5f0] p-4 pr-12 font-['Space_Mono'] text-sm placeholder-gray-500 outline-none transition-all focus:shadow-[inset_2px_2px_0px_#000] disabled:opacity-50 disabled:cursor-not-allowed md:text-base"
                style={{ borderWidth: "3px" }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || !chatId || isLoading}
              className="flex h-14 w-14 items-center justify-center border-3 border-black bg-black text-xl text-white transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderWidth: "3px" }}
            >
              {isLoading ? "..." : "↑"}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-['Space_Mono'] text-xs text-gray-500">
              Enter para enviar • Shift+Enter para nova linha
            </p>
            <p className="font-['Space_Mono'] text-xs text-gray-500">
              provaAI pode cometer erros
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}