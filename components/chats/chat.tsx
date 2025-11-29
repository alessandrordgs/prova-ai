interface chatProps {
  messages: Array<{
    id: number;
    sender: "user" | "bot";
    text: string;
    timestamp: Date;
  }>;
  suggestedActions: Array<{
    label: string;
    action: string;
    icon: string;
  }>;
  inputValue: string;
  setInputValue: (value: string) => void;
}
export function Chat({
  messages,
  suggestedActions,
  inputValue,
  setInputValue,

}: chatProps) {
  return (
     <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  <div
                    className={`max-w-[85%] ${message.sender === "user"
                        ? "border-3 border-black bg-black p-4 text-white shadow-[-3px_3px_0px_#666]"
                        : "border-3 border-black bg-white p-4 shadow-[3px_3px_0px_#000]"
                      }`}
                    style={{ borderWidth: "3px" }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center border-2 border-current text-xs ${message.sender === "user" ? "bg-white text-black" : "bg-black text-white"
                          }`}
                      >
                        {message.sender === "user" ? "U" : "P"}
                      </span>
                      <span className="font-['Playfair_Display'] text-sm font-bold uppercase">
                        {message.sender === "user" ? "Você" : "provaAI"}
                      </span>
                      <span className={`font-['Space_Mono'] text-xs ${message.sender === "user" ? "text-gray-300" : "text-gray-500"
                        }`}>
                        {message.timestamp.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="font-['Space_Mono'] text-sm leading-relaxed md:text-base">
                      {message.text}
                    </p>
                  </div>
                </div>
              ))}

              {messages.length === 1 && (
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
            </div>
          </div>

          <div className="border-t-4 border-black bg-white p-4">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-end gap-3">
                <div className="relative flex-1">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Pergunte algo sobre suas fontes..."
                    rows={2}
                    className="w-full resize-none border-3 border-black bg-[#f5f5f0] p-4 pr-12 font-['Space_Mono'] text-sm placeholder-gray-500 outline-none transition-all focus:shadow-[inset_2px_2px_0px_#000] md:text-base"
                    style={{ borderWidth: "3px" }}
                  />
                </div>
                <button
                  disabled={!inputValue.trim()}
                  className="flex h-14 w-14 items-center justify-center border-3 border-black bg-black text-xl text-white transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderWidth: "3px" }}
                >
                  ↑
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
  )
}