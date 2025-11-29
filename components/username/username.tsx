import { DialogTrigger } from "@radix-ui/react-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
interface UsernameProps {
  open: boolean;
  openChange: (open: boolean) => void;
}
export default function Username({ open, openChange }: UsernameProps) {
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
          />
          <button className="mt-4 w-full cursor-pointer border-3 border-black bg-black py-3 font-['Space_Mono'] text-sm font-bold uppercase text-white transition-all hover:bg-white hover:text-black"
            style={{ borderWidth: "3px" }}>
            Salvar
          </button>

          <button className="mt-2 w-full cursor-pointer border-3 border-black bg-white py-3 font-['Space_Mono'] text-sm font-bold uppercase text-black transition-all hover:bg-black hover:text-white"
            style={{ borderWidth: "3px" }}>
            Continuar como convidado
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}