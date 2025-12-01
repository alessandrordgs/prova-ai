import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UploadProps {
  open: boolean;
  openChange: () => void;
  chatId: string | null;
  onUploadComplete?: () => void;
}

interface UploadStatus {
  fileName: string;
  status: "pending" | "uploading" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
}

export default function Upload({ open, openChange, chatId, onUploadComplete }: UploadProps) {
  const MAX_SIZE = 10 * 1024 * 1024;
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setUploadStatuses(
      acceptedFiles.map((file) => ({
        fileName: file.name,
        status: "pending",
        progress: 0,
      }))
    );
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 5,
    maxSize: MAX_SIZE,
    disabled: isUploading,
  });

  const updateStatus = (
    fileName: string,
    updates: Partial<UploadStatus>
  ) => {
    setUploadStatuses((prev) =>
      prev.map((s) => (s.fileName === fileName ? { ...s, ...updates } : s))
    );
  };

  const handleUpload = async () => {
    if (!chatId) {
      toast.error("Selecione ou crie um chat antes de enviar arquivos.");
      return;
    }

    setIsUploading(true);

    // Start uploads in background
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append("files", file);
      formData.append("chatId", chatId);

      try {
        const res = await fetch("/api/pdf", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Upload failed");
        }

        return { success: true, fileName: file.name };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        toast.error(`Erro ao enviar ${file.name}: ${message}`);
        return { success: false, fileName: file.name, error: message };
      }
    });

    toast.success(`Enviando ${files.length} arquivo${files.length > 1 ? 's' : ''}...`);
    toast.info("Acompanhe o progresso na sidebar →");

    handleClose();

    Promise.all(uploadPromises).then((results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful > 0) {
        toast.success(`${successful} arquivo${successful > 1 ? 's' : ''} processando`);
      }
      if (failed > 0) {
        toast.error(`${failed} arquivo${failed > 1 ? 's falharam' : ' falhou'}`);
      }

      onUploadComplete?.();
    });
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      setUploadStatuses([]);
      openChange();
    }
  };

  const getStatusText = (status: UploadStatus["status"]) => {
    switch (status) {
      case "pending":
        return "Aguardando";
      case "uploading":
        return "Enviando...";
      case "processing":
        return "Processando...";
      case "completed":
        return "Concluído";
      case "error":
        return "Erro";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-['Playfair_Display'] text-xl font-bold uppercase">
            Upload de Arquivos
          </DialogTitle>
        </DialogHeader>

        {files.length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-3 border-dashed border-black p-10 text-center cursor-pointer transition-all ${isDragActive ? "bg-black text-white scale-105" : "bg-[#f5f5f0] hover:bg-gray-100 hover:scale-105"
              }`}
            style={{ borderWidth: "3px" }}
          >
            <input {...getInputProps()} />
            <div className="font-['Space_Mono'] text-sm">
              {isDragActive ? (
                <p className="text-lg">
                  Solte os arquivos aqui...
                </p>
              ) : (
                <>
                  <p className="text-base mb-2">Arraste PDFs para cá ou clique para selecionar</p>
                  <p className="text-xs text-gray-500">Máximo 5 arquivos, 10MB cada</p>
                  <p className="text-xs text-gray-400 mt-2">Múltiplos arquivos suportados </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto pr-2">
              <h2 className="font-['Playfair_Display'] text-lg font-semibold mt-2 mb-3 uppercase">
                Arquivos selecionados ({files.length}):
              </h2>
              <div className="space-y-3">
                {uploadStatuses.map((status, index) => (
                  <div
                    key={status.fileName}
                    className="border-3 border-black p-4 font-['Space_Mono'] text-sm bg-white"
                    style={{ borderWidth: "3px" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1 font-medium">{status.fileName}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span className="font-medium">{getStatusText(status.status)}</span>
                      <span className="font-mono">{status.progress}%</span>
                    </div>
                    {status.status !== "pending" && (
                      <div className="mt-3 h-2 border-2 border-black overflow-hidden">
                        <div
                          className={`h-full transition-all ${status.status === "error"
                            ? "bg-red-500"
                            : status.status === "completed"
                              ? "bg-green-500"
                              : "bg-black"
                            }`}
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                    )}
                    {status.error && (
                      <p
                        className="text-red-500 text-xs mt-2 font-medium"
                      >
                        {status.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                disabled={isUploading}
                className="border-3 border-black bg-black text-white px-8 py-3 font-['Space_Mono'] text-sm uppercase transition-all hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderWidth: "3px" }}
                onClick={handleUpload}
              >
                {isUploading ? "Enviando..." : `Enviar ${files.length} arquivo${files.length > 1 ? 's' : ''}`}
              </button>
              <button
                disabled={isUploading}
                className="border-3 border-black bg-white text-black px-8 py-3 font-['Space_Mono'] text-sm uppercase transition-all hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderWidth: "3px" }}
                onClick={handleClose}
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}