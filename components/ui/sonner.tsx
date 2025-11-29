"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        className: "font-['Space_Mono'] border-[3px] border-black bg-white text-black",
        style: {
          boxShadow: "4px 4px 0px #0a0a0a",
          borderRadius: "0px",
        },
        classNames: {
          title: "font-['Playfair_Display'] font-bold text-sm",
          description: "font-['Space_Mono'] text-xs text-gray-600",
          actionButton: "border-[2px] border-black bg-black text-white font-['Space_Mono'] text-xs font-bold hover:bg-white hover:text-black transition-colors",
          cancelButton: "border-[2px] border-black bg-white text-black font-['Space_Mono'] text-xs font-bold hover:bg-black hover:text-white transition-colors",
          success: "border-black bg-white text-black",
          error: "border-black bg-white text-black",
          warning: "border-black bg-white text-black",
          info: "border-black bg-white text-black",
        },
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#0a0a0a",
          "--normal-border": "#0a0a0a",
          "--border-radius": "0px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
