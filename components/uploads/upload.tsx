import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useCallback } from "react";
interface UploadProps {
  open: boolean;
  openChange: () => void;
}
export default function Upload({ open, openChange }: UploadProps ) {
  const MAX_SIZE = 10 * 1024 * 1024;
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log(acceptedFiles);
  }, [])
    const {getRootProps, getInputProps, isDragActive, acceptedFiles} = useDropzone({
      onDrop,
      multiple: true,
      accept: {
        'application/pdf': ['.pdf'],
      },
      maxFiles: 5,
      maxSize: MAX_SIZE,
    })
  return (
    <Dialog open={open} onOpenChange={openChange}> 
      <DialogContent>
        <DialogHeader>
           <DialogTitle>Upload de Arquivos</DialogTitle>
        </DialogHeader>
        <div {...getRootProps()} className="border-2 border-dashed border-gray-300 p-10 text-center cursor-pointer">
          <input {...getInputProps()} />
          {
            isDragActive ?
              <p>Arraste os arquivos para cá...</p> :
              <p>Arraste os arquivos para cá, ou clique para selecionar os arquivos</p>
          }
        </div>

        <div>
          <h2 className="text-lg font-semibold mt-4 mb-2">Arquivos selecionados:</h2>
          <ul className="list-disc list-inside">
            {acceptedFiles.map((file) => (
              <li key={file.name} className="text-sm">
                {file.name} - {(file.size / (1024 * 1024)).toFixed(2)} MB
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}