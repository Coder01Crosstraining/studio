
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wrench, AppWindow, MessageSquare, LayoutTemplate, ClipboardList, Sheet, X, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';

const directLinkTools = [
  {
    name: 'CLez',
    icon: AppWindow,
    href: 'https://app.clez.co/',
    description: 'Ir a CLez CRM',
  },
  {
    name: 'Kommo',
    icon: MessageSquare,
    href: 'https://www.kommo.com/',
    description: 'Ir a Kommo CRM',
  },
  {
    name: 'Builderall',
    icon: LayoutTemplate,
    href: 'https://www.builderall.com/',
    description: 'Ir a Builderall',
  },
  {
    name: 'Encuestas',
    icon: ClipboardList,
    href: 'https://forms.google.com/',
    description: 'Acceder a encuestas (Google Forms)',
  },
];

const sheetFormats = [
    { name: "Auditoría Interna", href: "https://sheets.google.com/" },
    { name: "Acción Preventiva/Correctiva", href: "https://sheets.google.com/" },
    { name: "Acta de Reunión", href: "https://sheets.google.com/" },
    { name: "Proceso de Descargos", href: "https://sheets.google.com/" },
]

export function ToolsToolbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSheetsDialogOpen, setIsSheetsDialogOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative flex flex-col items-center gap-2">
          {/* Expanded tools */}
          <div
            className={cn(
              "flex flex-col items-center gap-2 transition-all duration-300 ease-in-out",
              isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            {/* --- Formatos (Google Sheets) Dialog Trigger --- */}
             <Dialog open={isSheetsDialogOpen} onOpenChange={setIsSheetsDialogOpen}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Button size="icon" className="rounded-full w-12 h-12 shadow-lg" aria-label="Abrir formatos de Google Sheets">
                                <Sheet className="h-6 w-6" />
                            </Button>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p>Acceder a formatos (Google Sheets)</p></TooltipContent>
                </Tooltip>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Formatos de Google Sheets</DialogTitle>
                        <DialogDescription>
                            Accede a los formatos y documentos importantes de la operación.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        {sheetFormats.map((format) => (
                           <a href={format.href} target="_blank" rel="noopener noreferrer" key={format.name} className="group">
                             <Card className="hover:bg-accent hover:border-primary transition-colors">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-primary"/>
                                        <p className="font-medium">{format.name}</p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </CardContent>
                             </Card>
                           </a>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* --- Other Direct Link Tools --- */}
            {directLinkTools.map((tool) => (
              <Tooltip key={tool.name}>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    size="icon"
                    className="rounded-full w-12 h-12 shadow-lg"
                    aria-label={tool.description}
                  >
                    <a href={tool.href} target="_blank" rel="noopener noreferrer">
                      <tool.icon className="h-6 w-6" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{tool.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Main FAB button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-xl"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
              >
                <Wrench className={cn("h-7 w-7 transition-transform duration-300", isOpen && "rotate-45 scale-0")} />
                <X className={cn("h-7 w-7 absolute transition-transform duration-300", !isOpen && "-rotate-45 scale-0")} />
                <span className="sr-only">Abrir herramientas</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{isOpen ? 'Cerrar herramientas' : 'Abrir herramientas'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
