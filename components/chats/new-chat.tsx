import z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
interface NewChatProps {
  open: boolean;
  openChange: () => void;
}

const NewChatSchema = z.object({
  name: z.string().min(1, "O nome do chat é obrigatório"),
  banca: z.string().optional(),
});
export default function NewChat({
  open,
  openChange
}: NewChatProps) {

  const bancas: string[] = [
    'FGV',
    'CESPE/Cebraspe',
    'FCC',
    'Outro'
  ]


  async function createChat() {
    try {
      throw new Error("Not implemented");
    } catch (error) {
      console.log(error)
      toast.error("Erro ao criar o chat. Tente novamente.");
    } 
  }
  return (<Dialog open={open} onOpenChange={openChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo Chat</DialogTitle>
      </DialogHeader>
      <div>
        <input type="text" placeholder="nome do chat" className="w-full border-2 p-2 font-[Space_mono] text-sm" />

        <Select>
          <SelectTrigger className="mt-4 w-full">
            <SelectValue placeholder="Selecione a banca" />
          </SelectTrigger>
          <SelectContent>
            {bancas.map((banca) => (
              <SelectItem key={banca} value={banca}>
                {banca}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex align-items-center justify-center gap-5 mt-4">
          <button className="bg-blue-500 hover:bg-blue-700 cursor-pointer text-white px-4 py-2 rounded mt-4 mr-2" onClick={() => {
            createChat()
          }}>
            Criar Chat
          </button>
          <button
            className="border cursor-pointer hover:bg-gray-300 px-4 py-2 rounded mt-4 mr-2"
            onClick={() => {
              openChange()
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
  )
}