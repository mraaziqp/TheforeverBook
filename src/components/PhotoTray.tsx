import React from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Sparkles, Plus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { UploadProgress } from '@/src/lib/upload';

interface Asset {
  url: string;
  id: string;
}

interface PhotoTrayProps {
  assets: Asset[];
  activeUploads?: Record<string, UploadProgress>;
  onMagicFill?: () => void;
  onFileUpload?: (files: FileList | null) => void;
}

const PhotoTray: React.FC<PhotoTrayProps> = ({ 
  assets, 
  activeUploads = {}, 
  onMagicFill, 
  onFileUpload 
}) => {
  const handleDragStart = (e: React.DragEvent, url: string) => {
    e.dataTransfer.setData('imagePath', url);
  };

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-24 lg:bottom-0 left-0 right-0 h-24 lg:h-32 glass-dark border-t border-white/10 z-[60] flex items-center px-4 lg:px-8 gap-4 lg:gap-8 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
    >
      <div className="flex flex-col gap-0.5 lg:gap-1 items-center justify-center pr-4 lg:pr-8 border-r border-white/5 min-w-max">
        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: '#4f46e5' }}
          whileTap={{ scale: 0.9 }}
          onClick={onMagicFill}
          className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-indigo-500 flex items-center justify-center transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] mb-1"
        >
          <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
        </motion.button>
        <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-indigo-400">Magic Fill</span>
      </div>

      <div className="flex-1 flex gap-3 lg:gap-4 overflow-x-auto no-scrollbar py-2 lg:py-4 items-center">
        {/* Direct In-Designer Upload Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="h-16 lg:h-20 aspect-square rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-indigo-500/50 flex flex-col items-center justify-center cursor-pointer shrink-0 relative transition-all group hover:bg-white/[0.02]"
        >
          <input
            type="file"
            multiple
            onChange={(e) => onFileUpload?.(e.target.files)}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          <Plus className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
          <span className="text-[7px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-indigo-400 mt-1">Add Photos</span>
        </motion.div>

        {assets.length === 0 && Object.keys(activeUploads).length === 0 ? (
          <div className="flex items-center gap-3 text-zinc-600 italic text-xs ml-2">
            <ImageIcon className="w-4 h-4 animate-pulse" />
            <span>Select 'Add Photos' to upload wedding captures...</span>
          </div>
        ) : (
          <>
            {/* Active Uploads (Proxies) */}
            {(Object.entries(activeUploads) as [string, UploadProgress][]).map(([id, upload]) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-16 lg:h-20 aspect-square rounded-xl overflow-hidden glass border-indigo-500/30 flex-shrink-0 relative group"
              >
                <img src={upload.thumbnail} alt="proxy" className="w-full h-full object-cover blur-[2px] scale-110" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${upload.progress}%` }}
                    className="h-full bg-indigo-500"
                   />
                </div>
              </motion.div>
            ))}

            {/* Completed Assets */}
            {assets.map((asset) => (
              <motion.div
                key={asset.id}
                whileHover={{ scale: 1.1, translateY: -5 }}
                draggable
                onDragStart={(e) => handleDragStart(e as any, asset.url)}
                className="h-16 lg:h-20 aspect-square rounded-xl overflow-hidden glass border-white/20 cursor-grab active:cursor-grabbing flex-shrink-0"
              >
                <img src={asset.url} alt="asset" className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </>
        )}
      </div>

      <div className="pl-4 lg:pl-8 border-l border-white/5 min-w-max text-right">
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{assets.length} Assets</div>
        <div className="text-[8px] font-mono text-zinc-600 uppercase">Live Studio Sync</div>
      </div>
    </motion.div>
  );
};

export default PhotoTray;
