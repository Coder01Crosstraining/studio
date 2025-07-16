
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wrench, AppWindow, MessageSquare, LayoutTemplate, ClipboardList, Sheet, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const tools = [
  {
    name: 'CLez',
    icon: AppWindow,
    href: '#', // Placeholder, CLez es una app de Windows, se puede usar un URI scheme si existe.
    description: 'Abrir sistema interno CLez',
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
  {
    name: 'Formatos',
    icon: Sheet,
    href: 'https://sheets.google.com/',
    description: 'Acceder a formatos (Google Sheets)',
  },
];

export function ToolsToolbar() {
  const [isOpen, setIsOpen] = useState(false);

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
            {tools.map((tool) => (
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
