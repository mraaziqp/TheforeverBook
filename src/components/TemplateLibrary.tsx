import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, Grid, Layout as LayoutIcon, Type, Sparkles, Image as ImageIcon, Columns, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Template {
  id: string;
  name: string;
  icon: any;
  layout: any;
}

const SINGLE_PAGE_WIDTH = 11 * 72;
const PAGE_HEIGHT = 8.5 * 72;

const CATEGORIES = [
  { id: 'engagement', name: 'Engagement Special 💖' },
  { id: 'cinematic', name: 'Cinematic' },
  { id: 'editorial', name: 'Editorial' },
  { id: 'minimalist', name: 'Minimalist' },
  { id: 'brutalist', name: 'Brutalist' }
];

const TEMPLATES: Record<string, Template[]> = {
  engagement: [
    {
      id: 'eng-polaroid',
      name: 'Polaroid Memory Stack',
      icon: Columns,
      layout: {
        objects: [
          { type: 'rect', left: 100, top: 80, width: 280, height: 340, fill: '#ffffff', stroke: '#e4e4e7', strokeWidth: 1, rx: 8, ry: 8, isPlaceholder: false, shadow: { color: 'rgba(0,0,0,0.15)', blur: 10, offsetX: 5, offsetY: 5 } },
          { type: 'rect', left: 120, top: 100, width: 240, height: 240, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'i-text', left: 150, top: 360, text: 'Our First Day', fontFamily: 'Playfair Display', fontSize: 20, fill: '#18181b', fontStyle: 'italic' },
          { type: 'rect', left: 450, top: 120, width: 280, height: 340, fill: '#ffffff', stroke: '#e4e4e7', strokeWidth: 1, rx: 8, ry: 8, angle: -6, isPlaceholder: false, shadow: { color: 'rgba(0,0,0,0.15)', blur: 10, offsetX: 5, offsetY: 5 } },
          { type: 'rect', left: 470, top: 140, width: 240, height: 240, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', angle: -6, isPlaceholder: true },
          { type: 'i-text', left: 500, top: 390, text: 'She Said Yes!', fontFamily: 'Playfair Display', fontSize: 20, fill: '#18181b', angle: -6, fontStyle: 'italic' },
          { type: 'rect', left: 850, top: 90, width: 280, height: 340, fill: '#ffffff', stroke: '#e4e4e7', strokeWidth: 1, rx: 8, ry: 8, angle: 4, isPlaceholder: false, shadow: { color: 'rgba(0,0,0,0.15)', blur: 10, offsetX: 5, offsetY: 5 } },
          { type: 'rect', left: 870, top: 110, width: 240, height: 240, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', angle: 4, isPlaceholder: true },
          { type: 'i-text', left: 900, top: 370, text: 'Forever Begins', fontFamily: 'Playfair Display', fontSize: 20, fill: '#18181b', angle: 4, fontStyle: 'italic' }
        ]
      }
    },
    {
      id: 'eng-love-grid',
      name: 'Eternal Love Grid',
      icon: Grid,
      layout: {
        objects: [
          { type: 'rect', left: 60, top: 50, width: 280, height: 220, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'rect', left: 380, top: 50, width: 280, height: 220, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'rect', left: 60, top: 300, width: 280, height: 220, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'rect', left: 380, top: 300, width: 280, height: 220, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'rect', left: SINGLE_PAGE_WIDTH + 80, top: 50, width: 600, height: 380, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'i-text', left: SINGLE_PAGE_WIDTH + 80, top: 460, text: '"Two souls with but a single thought, two hearts that beat as one."', fontFamily: 'Playfair Display', fontSize: 22, fill: '#4f46e5', fontWeight: 'normal', fontStyle: 'italic', width: 600 }
        ]
      }
    },
    {
      id: 'eng-golden',
      name: 'Golden Ratio Masonry',
      icon: LayoutIcon,
      layout: {
        objects: [
          { type: 'rect', left: 50, top: 50, width: 450, height: 512, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'rect', left: 530, top: 50, width: 450, height: 240, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'rect', left: 530, top: 320, width: 210, height: 242, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'rect', left: 770, top: 320, width: 210, height: 242, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'i-text', left: 1050, top: 250, text: 'M E M O R I E S', fontFamily: 'Inter', fontSize: 12, fill: '#94a3b8', fontWeight: 'bold', tracking: 8, angle: 90 }
        ]
      }
    },
    {
      id: 'eng-panoramic',
      name: 'Panoramic Dreamscape',
      icon: Square,
      layout: {
        objects: [
          { type: 'rect', left: 80, top: 60, width: SINGLE_PAGE_WIDTH * 2 - 160, height: PAGE_HEIGHT - 180, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'i-text', left: SINGLE_PAGE_WIDTH - 200, top: PAGE_HEIGHT - 90, text: 'THE FOREVER ADVENTURE', fontFamily: 'Playfair Display', fontSize: 24, fill: '#18181b', fontWeight: 'light', tracking: 6, width: 400, textAlign: 'center' }
        ]
      }
    }
  ],
  cinematic: [
    {
      id: 'cine-hero',
      name: 'The Wide Angle',
      icon: Square,
      layout: {
        objects: [
          { type: 'rect', left: 0, top: 0, width: SINGLE_PAGE_WIDTH * 2, height: PAGE_HEIGHT, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'i-text', left: 100, top: PAGE_HEIGHT - 100, text: 'CINEMATIC JOURNEY', fontFamily: 'Playfair Display', fontSize: 60, fill: '#18181b', fontWeight: 'bold' }
        ]
      }
    },
    {
      id: 'cine-split',
      name: 'Double Vision',
      icon: Columns,
      layout: {
        objects: [
          { type: 'rect', left: 20, top: 20, width: SINGLE_PAGE_WIDTH - 40, height: PAGE_HEIGHT - 40, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true },
          { type: 'rect', left: SINGLE_PAGE_WIDTH + 20, top: 20, width: SINGLE_PAGE_WIDTH - 40, height: PAGE_HEIGHT - 40, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true }
        ]
      }
    },
    {
      id: 'cine-triptych',
      name: 'The Triptych',
      icon: Grid,
      layout: {
        objects: [
          { type: 'rect', left: 50, top: 50, width: 300, height: 500, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7' },
          { type: 'rect', left: 400, top: 50, width: 300, height: 500, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7' },
          { type: 'rect', left: 750, top: 50, width: 300, height: 500, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7' }
        ]
      }
    },
    {
      id: 'cine-panorama',
      name: 'Floating Vista',
      icon: Square,
      layout: {
        objects: [
          { type: 'rect', left: 100, top: 100, width: SINGLE_PAGE_WIDTH * 2 - 200, height: PAGE_HEIGHT - 200, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true, rx: 20, ry: 20 }
        ]
      }
    }
  ],
  editorial: [
    {
      id: 'edit-mag',
      name: 'Magazine Spread',
      icon: LayoutIcon,
      layout: {
        objects: [
          { type: 'rect', left: 50, top: 50, width: 400, height: 500, fill: 'rgba(200,200,200,0.1)', isPlaceholder: true, stroke: '#e4e4e7' },
          { type: 'i-text', left: 500, top: 100, text: 'The Art of Living', fontFamily: 'Playfair Display', fontSize: 48, width: 300 },
          { type: 'i-text', left: 500, top: 170, text: 'Captured in frames that breathe life into the mundane.', fontFamily: 'Inter', fontSize: 16, width: 300, fill: '#71717a' },
          { type: 'rect', left: SINGLE_PAGE_WIDTH + 50, top: 50, width: SINGLE_PAGE_WIDTH - 100, height: PAGE_HEIGHT - 100, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7' }
        ]
      }
    },
    {
      id: 'edit-vogue',
      name: 'The Vogue',
      icon: Columns,
      layout: {
        objects: [
          { type: 'i-text', left: 100, top: 80, text: 'VINTAGE', fontFamily: 'Playfair Display', fontSize: 120, fontWeight: 'bold', fill: '#000', opacity: 0.1 },
          { type: 'rect', left: SINGLE_PAGE_WIDTH / 2, top: 50, width: SINGLE_PAGE_WIDTH, height: 550, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7' }
        ]
      }
    },
    {
      id: 'edit-journal',
      name: 'Journal Entry',
      icon: Type,
      layout: {
        objects: [
          { type: 'i-text', left: 100, top: 100, text: 'DAY 42', fontFamily: 'Courier New', fontSize: 14, tracking: 5 },
          { type: 'rect', left: 100, top: 140, width: 600, height: 350, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7' },
          { type: 'i-text', left: 100, top: 520, text: 'The lights danced across the horizon, painting the sky in shades of gold and deep indigo. We stood frozen, realizing this was the moment we would tell our grandchildren about.', fontFamily: 'Inter', fontSize: 13, width: 600, fill: '#52525b' }
        ]
      }
    }
  ],
  minimalist: [
    {
      id: 'min-dot',
      name: 'The Singular Dot',
      icon: Square,
      layout: {
        objects: [
          { type: 'rect', left: SINGLE_PAGE_WIDTH - 100, top: PAGE_HEIGHT / 2 - 100, width: 200, height: 200, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7' }
        ]
      }
    },
    {
      id: 'min-focus',
      name: 'Pure Focus',
      icon: Square,
      layout: {
        objects: [
          { type: 'rect', left: 400, top: 150, width: 800, height: 350, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7' }
        ]
      }
    },
    {
      id: 'min-offset',
      name: 'Quiet Offset',
      icon: Columns,
      layout: {
        objects: [
          { type: 'rect', left: SINGLE_PAGE_WIDTH + 150, top: 150, width: 400, height: 350, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7' }
        ]
      }
    }
  ],
  brutalist: [
    {
      id: 'brut-raw',
      name: 'Raw Overlap',
      icon: Grid,
      layout: {
        objects: [
          { type: 'rect', left: 100, top: 50, width: 600, height: 400, fill: 'rgba(0,0,0,0.1)', isPlaceholder: true, stroke: '#e4e4e7' },
          { type: 'rect', left: 150, top: 100, width: 600, height: 400, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7', angle: -5 }
        ]
      }
    },
    {
      id: 'brut-stack',
      name: 'Staggered Chaos',
      icon: Grid,
      layout: {
        objects: [
          { type: 'rect', left: 50, top: 50, width: 300, height: 200, fill: 'rgba(0,0,0,0.1)', isPlaceholder: true, stroke: '#000', strokeWidth: 2 },
          { type: 'rect', left: 300, top: 150, width: 300, height: 200, fill: 'rgba(0,0,0,0.1)', isPlaceholder: true, stroke: '#000', strokeWidth: 2 },
          { type: 'rect', left: 550, top: 250, width: 300, height: 200, fill: 'rgba(0,0,0,0.1)', isPlaceholder: true, stroke: '#000', strokeWidth: 2 },
          { type: 'i-text', left: 800, top: 50, text: 'NO RULES', fontFamily: 'Impact', fontSize: 100, fill: '#000', opacity: 0.1 }
        ]
      }
    },
    {
      id: 'brut-grid',
      name: 'The Foundation',
      icon: Grid,
      layout: {
        objects: [
          { type: 'rect', left: 0, top: 0, width: 1584, height: 612, fill: 'white' },
          { type: 'rect', left: 50, top: 50, width: 300, height: 512, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#000' },
          { type: 'rect', left: 400, top: 50, width: 300, height: 512, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#000' },
          { type: 'rect', left: 750, top: 50, width: 300, height: 512, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#000' }
        ]
      }
    }
  ]
};



interface Template {
  id: string;
  name: string;
  icon: any;
  layout: any;
  isCustom?: boolean;
}

interface TemplateLibraryProps {
  onApplyTemplate: (layout: any) => void;
  projectId?: string;
  activeSpreadData?: any;
  customTemplates?: Template[];
  onSaveTemplate?: (name: string) => void;
  onDeleteTemplate?: (id: string) => void;
}

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ 
  onApplyTemplate, 
  projectId, 
  activeSpreadData, 
  customTemplates = [], 
  onSaveTemplate, 
  onDeleteTemplate 
}) => {
  const [activeCat, setActiveCat] = useState('engagement');

  const filteredTemplates = activeCat === 'custom' 
    ? customTemplates 
    : (TEMPLATES[activeCat] || []);

  return (
    <div className="flex flex-col h-full bg-slate-950/20 rounded-[2rem]">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-6 shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            className={cn(
              "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border",
              activeCat === cat.id 
                ? "bg-white text-slate-950 border-white" 
                : "text-zinc-500 border-white/5 hover:border-white/20"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {activeCat === 'custom' && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            const name = prompt("Enter a name for your custom book style:");
            if (name) onSaveTemplate?.(name);
          }}
          className="w-full mb-4 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Save Current Spread
        </motion.button>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredTemplates.map((template) => (
            <motion.div
              key={template.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex items-center justify-between p-4 glass rounded-2xl border-white/5 text-left group transition-all hover:bg-white/[0.03]"
            >
              <button
                onClick={() => onApplyTemplate(template.layout)}
                className="flex-1 flex items-center gap-4 text-left cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors shrink-0 text-zinc-400">
                  {template.isCustom ? <LayoutIcon className="w-5 h-5" /> : <template.icon className="w-5 h-5" />}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-zinc-200 mb-0.5 truncate">{template.name}</div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                    {template.isCustom ? 'Custom Style' : 'Spread Preset'}
                  </div>
                </div>
              </button>

              {template.isCustom && (
                <button
                  onClick={() => onDeleteTemplate?.(template.id)}
                  className="p-2 hover:bg-red-500/10 rounded-xl text-zinc-500 hover:text-red-400 transition-colors shrink-0 ml-2 cursor-pointer"
                  title="Delete Custom Style"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
          {activeCat === 'custom' && filteredTemplates.length === 0 && (
            <div className="py-8 text-center text-zinc-600 text-xs italic">
              No custom book styles saved yet...
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 shrink-0">
         <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block mb-2">Pro Designer</span>
            <p className="text-[10px] text-zinc-500 leading-relaxed max-w-[140px]">Cinematic spreads selected for your current book format.</p>
         </div>
      </div>
    </div>
  );
};

export default TemplateLibrary;

