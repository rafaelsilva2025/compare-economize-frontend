import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SponsoredBadge({ small = false }) {
  if (small) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-xs font-medium rounded-full cursor-help">
              <TrendingUp className="w-3 h-3" />
              Patrocinado
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs max-w-[200px]">Este produto aparece aqui porque é patrocinado</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-sm font-medium rounded-lg border border-amber-200 cursor-help">
            <TrendingUp className="w-4 h-4" />
            <span>Patrocinado</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-[200px]">Este produto aparece aqui porque é patrocinado</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}