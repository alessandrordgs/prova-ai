import Upload from "../uploads/upload";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Source {
  id: string;
  name: string;
  status: string;
  progress: number;
  createdAt: Date;
}

interface SidebarSourcesProps {
  chatId: string | null;
}

export default function SidebarSources({ chatId }: SidebarSourcesProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSources = useCallback(async () => {
    if (!chatId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/pdf?chatId=${chatId}`);
      if (res.ok) {
        const data = await res.json();
        setSources(
          data.map((s: { id: string; name: string; status: string; progress: number; createdAt: string }) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            progress: s.progress,
            createdAt: new Date(s.createdAt),
          }))
        );
      }
    } catch {
      console.error("Erro ao carregar sources");
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Poll for progress updates when files are processing
  useEffect(() => {
    if (!chatId) return;

    const hasProcessing = sources.some(s => s.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchSources();
    }, 1000); // Poll every 1 second

    return () => clearInterval(interval);
  }, [chatId, sources, fetchSources]);

  const handleRemoveSource = async (id: string) => {
    try {
      const res = await fetch(`/api/pdf?sourceId=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== id));
        toast.success("Fonte removida com sucesso!");
      } else {
        toast.error("Erro ao remover fonte.");
      }
    } catch {
      toast.error("Erro ao remover fonte.");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✅";
      case "processing":
        return "⚙️";
      case "error":
        return "❌";
      default:
        return "📄";
    }
  };

  return (
    <aside className="hidden w-72 shrink-0 border-l-4 border-black bg-white lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b-3 border-black p-4" style={{ borderBottomWidth: "3px" }}>
          <h2 className="font-['Playfair_Display'] text-lg font-bold uppercase">
            Fontes
          </h2>
          <p className="mt-1 font-['Space_Mono'] text-xs text-gray-600">
            Materiais para estudo
          </p>
        </div>

        <div className="border-b-3 border-dashed border-black p-3" style={{ borderBottomWidth: "3px" }}>
          <button
            onClick={() => setUploadOpen(!uploadOpen)}
            disabled={!chatId}
            className="flex w-full items-center justify-center gap-2 border-3 border-black bg-black py-3 font-['Space_Mono'] text-sm font-bold uppercase text-white transition-all hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderWidth: "3px" }}
          >
            <span className="text-lg">+</span> Adicionar
          </button>
          <Upload
            open={uploadOpen}
            openChange={() => setUploadOpen(!uploadOpen)}
            chatId={chatId}
            onUploadComplete={fetchSources}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!chatId && (
            <p className="text-center font-['Space_Mono'] text-xs text-gray-500">
              Selecione um chat para ver as fontes
            </p>
          )}

          {chatId && isLoading && sources.length === 0 && (
            <p className="text-center font-['Space_Mono'] text-xs text-gray-500">
              Carregando...
            </p>
          )}

          {chatId && !isLoading && sources.length === 0 && (
            <p className="text-center font-['Space_Mono'] text-xs text-gray-500">
              Nenhuma fonte adicionada
            </p>
          )}

          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="group flex items-start gap-2 border-3 border-black bg-[#f5f5f0] p-3 transition-all hover:bg-black hover:text-white"
                style={{ borderWidth: "3px" }}
              >
                <motion.span
                  className="text-sm"
                  animate={source.status === "processing" ? { rotate: 360 } : {}}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                  {getStatusIcon(source.status)}
                </motion.span>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-['Space_Mono'] text-sm font-medium">
                    {source.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-['Space_Mono'] text-xs text-gray-500 group-hover:text-gray-300">
                      {source.createdAt.toLocaleDateString("pt-BR")}
                    </p>
                    {source.status === "processing" && (
                      <span className="font-['Space_Mono'] text-xs font-bold">
                        {Math.round(source.progress)}%
                      </span>
                    )}
                  </div>
                  {source.status === "processing" && (
                    <div className="mt-2 h-1.5 w-full border border-current overflow-hidden">
                      <motion.div
                        className="h-full bg-current"
                        initial={{ width: 0 }}
                        animate={{ width: `${source.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveSource(source.id)}
                  className="text-gray-400 hover:text-red-500 group-hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t-3 border-black p-3" style={{ borderTopWidth: "3px" }}>
          <p className="text-center font-['Space_Mono'] text-xs text-gray-500">
            {sources.length} fonte{sources.length !== 1 ? "s" : ""} adicionada{sources.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </aside>
  );
}