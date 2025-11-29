import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { useState } from "react";
import { createGuestUser, createUser } from "@/lib/actions/user";
interface UsernameProps {
  open: boolean;
  openChange: (open: boolean) => void;
}
export default function Username({ open, openChange }: UsernameProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSave() {
    setError(null);
    setIsLoading(true);

    const result = await createUser(username);

    if (result.success) {
      openChange(false);
    } else {
      setError(result.message || "Erro desconhecido");
    }

    setIsLoading(false);
  }

  async function handleGuest() {
    setIsLoading(true);

    const result = await createGuestUser();

    if (result.success) {
      openChange(false);
    } else {
      setError(result.message || "Erro desconhecido");
    }

    setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Defina seu nome de usuário
          </DialogTitle>
          <DialogDescription>
            Por favor, escolha um nome de usuário para continuar.
          </DialogDescription>
        </DialogHeader>
        <div>
          <input
            type="text"
            placeholder="Nome de usuário"
            className="w-full border-2 border-black p-2 font-['Space_Mono'] text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleSave} disabled={isLoading} className="mt-4 w-full cursor-pointer border-3 border-black bg-black py-3 font-['Space_Mono'] text-sm font-bold uppercase text-white transition-all hover:bg-white hover:text-black"
            style={{ borderWidth: "3px" }}>
            {isLoading ? 'Salvando...' : "Salvar"}
          </button>
          {error && (
            <p className="mt-2 font-['Space_Mono'] text-xs text-red-600">
              {error}
            </p>
          )}

          <button onClick={handleGuest} disabled={isLoading} className="mt-2 w-full cursor-pointer border-3 border-black bg-white py-3 font-['Space_Mono'] text-sm font-bold uppercase text-black transition-all hover:bg-black hover:text-white"
            style={{ borderWidth: "3px" }}>
            Continuar como convidado
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}