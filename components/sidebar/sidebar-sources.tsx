import { Source } from "@/components/home/home";
import Upload from "../uploads/upload";
import { useState } from "react";

interface sidebarSoucesProps  {
  sources: Array<Source>;
  handleRemoveSource: (id: number) => void;
  }
export default function SidebarSources( {
  sources,
  handleRemoveSource,
}: sidebarSoucesProps) {

  const [uploadOpen, setUploadOpen] = useState(false);
  return (
     <aside className="hidden w-72 shrink-0 border-l-4 border-black bg-white lg:block">
          <div className="flex h-full flex-col">
           
            <div className="border-b-3 border-black p-4" style={{ borderBottomWidth: "3px" }}>
              <h2 className="font-['Playfair_Display'] text-lg font-bold uppercase">
              </h2>
              <p className="mt-1 font-['Space_Mono'] text-xs text-gray-600">
                Materiais para estudo
              </p>
            </div>

            <div className="border-b-3 border-dashed border-black p-3" style={{ borderBottomWidth: "3px" }}>
              <button onClick={() => setUploadOpen(!uploadOpen)} className="flex w-full items-center justify-center gap-2 border-3 border-black bg-black py-3 font-['Space_Mono'] text-sm font-bold uppercase text-white transition-all hover:bg-white hover:text-black"
                style={{ borderWidth: "3px" }}>
                <span className="text-lg">+</span> Adicionar
              </button>
              <Upload
                open={uploadOpen}
                openChange={() => setUploadOpen(!uploadOpen)}
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="group flex items-start gap-2 border-3 border-black bg-[#f5f5f0] p-3 transition-all hover:bg-black hover:text-white"
                    style={{ borderWidth: "3px" }}
                  >
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-['Space_Mono'] text-sm font-medium">
                        {source.name}
                      </p>
                      <p className="font-['Space_Mono'] text-xs text-gray-500 group-hover:text-gray-300">
                        {source.addedAt.toLocaleDateString("pt-BR")}
                      </p>
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
                Arraste arquivos aqui
              </p>
            </div>
          </div>
        </aside>
  )
}