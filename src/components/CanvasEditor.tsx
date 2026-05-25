import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, Image as FabricImage, Rect, IText, Line } from 'fabric';
import { cn } from '@/src/lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { 
  Square, 
  Type, 
  Eye, 
  Trash2, 
  Maximize2,
  Undo2,
  Redo2,
  RotateCcw,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Focus,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';

interface CanvasEditorProps {
  projectId: string;
  pageId: string;
  type?: 'spread' | 'cover';
  initialData?: any;
  onStateChange?: (data: any) => void;
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({ projectId, pageId, type = 'spread', initialData, onStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const isRemoteUpdate = useRef(false);
  const [showGuides, setShowGuides] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dimensions
  const SINGLE_PAGE_WIDTH = 11 * 72;
  const PAGE_HEIGHT = 8.5 * 72;
  const SPINE_WIDTH = type === 'cover' ? 0.5 * 72 : 0; // 0.5 inch spine
  const SPREAD_WIDTH = (SINGLE_PAGE_WIDTH * 2) + SPINE_WIDTH;
  const BLEED_PX = 3 * (72 / 25.4);
  const SAFE_ZONE_MARGIN = 0.5 * 72;

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [spreadBg, setSpreadBg] = useState('#ffffff');
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const persistToDatabase = useCallback(async (data: any) => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, `projects/${projectId}/pages`, pageId), {
        canvasData: data
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `projects/${projectId}/pages/${pageId}`);
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  }, [projectId, pageId]);

  const handleUpdate = useCallback(() => {
    if (isRemoteUpdate.current || !fabricCanvas.current) return;
    const json = fabricCanvas.current.toObject(['isPlaceholder', 'isGuide']);
    onStateChange?.(json);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(json)));
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    // Debounced save to Firestore
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => persistToDatabase(json), 2000);
  }, [history, historyIndex, persistToDatabase, onStateChange]);

  useEffect(() => {
    if (fabricCanvas.current) {
        fabricCanvas.current.set({ backgroundColor: spreadBg });
        fabricCanvas.current.renderAll();
        // Trigger save so BG is persisted
        handleUpdate();
    }
  }, [spreadBg, handleUpdate]);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 2));
  };

  const bringToFront = () => {
    const activeObject = fabricCanvas.current?.getActiveObject();
    if (activeObject && fabricCanvas.current) {
      fabricCanvas.current.bringObjectToFront(activeObject);
      fabricCanvas.current.renderAll();
    }
  };

  const sendToBack = () => {
    const activeObject = fabricCanvas.current?.getActiveObject();
    if (activeObject && fabricCanvas.current) {
      fabricCanvas.current.sendObjectToBack(activeObject);
      fabricCanvas.current.renderAll();
    }
  };

  const undo = () => {
    if (historyIndex > 0 && fabricCanvas.current) {
        const prev = history[historyIndex - 1];
        isRemoteUpdate.current = true;
        fabricCanvas.current.loadFromJSON(prev).then(() => {
            setHistoryIndex(historyIndex - 1);
            isRemoteUpdate.current = false;
            fabricCanvas.current?.renderAll();
        });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && fabricCanvas.current) {
        const next = history[historyIndex + 1];
        isRemoteUpdate.current = true;
        fabricCanvas.current.loadFromJSON(next).then(() => {
            setHistoryIndex(historyIndex + 1);
            isRemoteUpdate.current = false;
            fabricCanvas.current?.renderAll();
        });
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: SPREAD_WIDTH,
      height: PAGE_HEIGHT,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      fireRightClick: true,
      stopContextMenu: true,
    });

    fabricCanvas.current = canvas;

    // Pro Selection Styles
    const setSelectionStyles = (obj: any) => {
        obj.set({
            borderColor: '#6366f1',
            cornerColor: '#ffffff',
            cornerStrokeColor: '#6366f1',
            transparentCorners: false,
            cornerSize: 10,
            cornerStyle: 'circle',
            padding: 10,
        });
    };

    canvas.on('object:added', (options) => {
        if (options.target) setSelectionStyles(options.target);
    });

    // DnD Support
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      
      const files = e.dataTransfer?.files;
      const imageUrl = e.dataTransfer?.getData('imagePath');
      
      if (files && files.length > 0) {
        const pointer = canvas.getScenePoint(e);
        const targetResult = canvas.findTarget(e);
        const target = (targetResult as any)?.target || targetResult;
        
        // Render a stylish premium text loader on the canvas
        const loadingText = new IText('Uploading to Studio...', {
          left: pointer.x - 70,
          top: pointer.y - 10,
          fontFamily: 'Inter',
          fontSize: 12,
          fill: '#6366f1',
          fontWeight: 'bold',
          selectable: false,
          evented: false
        });
        canvas.add(loadingText);
        canvas.renderAll();

        try {
          const file = files[0];
          const { uploadFile } = await import('../lib/upload');
          const downloadUrl = await uploadFile(file, projectId, () => {});
          
          const { collection, addDoc } = await import('firebase/firestore');
          await addDoc(collection(db, `projects/${projectId}/assets`), {
            projectId,
            url: downloadUrl,
            metadata: {}
          });

          FabricImage.fromURL(downloadUrl, { crossOrigin: 'anonymous' }).then((img) => {
            canvas.remove(loadingText);
            if (target && (target as any).isPlaceholder) {
              img.set({
                left: target.left,
                top: target.top,
                scaleX: (target.width! * target.scaleX!) / img.width!,
                scaleY: (target.height! * target.scaleY!) / img.height!,
              });
              canvas.remove(target);
              canvas.add(img);
              canvas.setActiveObject(img);
            } else {
              img.scaleToWidth(300);
              img.left = pointer.x - 150;
              img.top = pointer.y - 100;
              canvas.add(img);
              canvas.setActiveObject(img);
            }
            handleUpdate();
          });
        } catch (err) {
          console.error("Canvas drop upload failed:", err);
          canvas.remove(loadingText);
          const errorText = new IText('Upload failed ❌', {
            left: pointer.x - 50,
            top: pointer.y - 10,
            fontFamily: 'Inter',
            fontSize: 12,
            fill: '#ef4444',
            fontWeight: 'bold',
            selectable: false,
            evented: false
          });
          canvas.add(errorText);
          canvas.renderAll();
          setTimeout(() => {
            canvas.remove(errorText);
            canvas.renderAll();
          }, 3000);
        }
      } else if (imageUrl) {
        const pointer = canvas.getScenePoint(e);
        const targetResult = canvas.findTarget(e);
        const target = (targetResult as any)?.target || targetResult;
        
        if (target && (target as any).isPlaceholder) {
          FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
            img.set({
              left: target.left,
              top: target.top,
              scaleX: (target.width! * target.scaleX!) / img.width!,
              scaleY: (target.height! * target.scaleY!) / img.height!,
            });
            canvas.remove(target);
            canvas.add(img);
            canvas.setActiveObject(img);
            handleUpdate();
          });
        } else {
          FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
            img.scaleToWidth(200);
            img.left = pointer.x;
            img.top = pointer.y;
            canvas.add(img);
            canvas.setActiveObject(img);
            handleUpdate();
          });
        }
      }
    };

    const canvasElement = canvasRef.current;
    canvasElement.addEventListener('drop', handleDrop);
    canvasElement.addEventListener('dragover', (e) => e.preventDefault());

    if (initialData) {
      try {
        let dataToLoad = initialData;
        
        if (typeof initialData === 'string') {
            if (initialData.includes('[object Object]')) {
              dataToLoad = { version: "6.0.0", objects: [] };
            } else {
              try {
                dataToLoad = JSON.parse(initialData);
              } catch (e) {
                console.error("Failed to parse initialData string:", e);
                dataToLoad = { version: "6.0.0", objects: [] };
              }
            }
        }

        canvas.loadFromJSON(dataToLoad).then(() => {
          drawSpineAndGuides(canvas);
          canvas.renderAll();
        }).catch(err => {
          console.error("Fabric loadFromJSON error:", err);
          drawSpineAndGuides(canvas);
        });
      } catch (err) {
        console.error("Canvas init error:", err);
        drawSpineAndGuides(canvas);
      }
    } else {
      drawSpineAndGuides(canvas);
    }

    function drawSpineAndGuides(c: Canvas) {
      c.getObjects().forEach(obj => {
        if ((obj as any).isGuide) c.remove(obj);
      });

      if (type === 'cover') {
        // Double Spine for cover wrapper
        const spineL = new Line([SINGLE_PAGE_WIDTH, 0, SINGLE_PAGE_WIDTH, PAGE_HEIGHT], {
          stroke: 'rgba(0,0,0,0.1)', strokeWidth: 2, selectable: false, evented: false, isGuide: true
        } as any);
        const spineR = new Line([SINGLE_PAGE_WIDTH + SPINE_WIDTH, 0, SINGLE_PAGE_WIDTH + SPINE_WIDTH, PAGE_HEIGHT], {
          stroke: 'rgba(0,0,0,0.1)', strokeWidth: 2, selectable: false, evented: false, isGuide: true
        } as any);
        c.add(spineL, spineR);
      } else {
        const spine = new Line([SINGLE_PAGE_WIDTH, 0, SINGLE_PAGE_WIDTH, PAGE_HEIGHT], {
          stroke: 'rgba(0,0,0,0.1)', strokeWidth: 2, selectable: false, evented: false, isGuide: true
        } as any);
        c.add(spine);
        c.sendObjectToBack(spine);
      }

      if (showGuides) {
        const bleedRect = new Rect({
          left: BLEED_PX, top: BLEED_PX,
          width: SPREAD_WIDTH - (BLEED_PX * 2), height: PAGE_HEIGHT - (BLEED_PX * 2),
          fill: 'transparent', stroke: 'rgba(239, 68, 68, 0.4)', strokeDashArray: [5, 5],
          selectable: false, evented: false, isGuide: true
        } as any);
        
        const safeZoneRect = new Rect({
          left: SAFE_ZONE_MARGIN, top: SAFE_ZONE_MARGIN,
          width: SPREAD_WIDTH - (SAFE_ZONE_MARGIN * 2), height: PAGE_HEIGHT - (SAFE_ZONE_MARGIN * 2),
          fill: 'transparent', stroke: 'rgba(59, 130, 246, 0.3)',
          selectable: false, evented: false, isGuide: true
        } as any);

        c.add(bleedRect, safeZoneRect);
      }
    }

    canvas.on('object:modified', handleUpdate);
    canvas.on('object:added', handleUpdate);
    canvas.on('object:removed', handleUpdate);

    // Firestore Real-time Sync
    const unsubscribe = onSnapshot(doc(db, `projects/${projectId}/pages`, pageId), (snapshot) => {
      if (snapshot.exists() && !isSaving) {
        const data = snapshot.data();
        const canvasData = data.canvasData;
        
        // Safety check for corrupted data
        if (typeof canvasData === 'string' && canvasData.includes('[object Object]')) {
          console.warn("Corrupted canvasData found in Firestore, skipping sync");
          return;
        }

        let incomingData = canvasData;
        if (typeof canvasData === 'string') {
          try {
            incomingData = JSON.parse(canvasData);
          } catch (e) {
            console.error("Failed to parse incoming sync data:", e);
            return;
          }
        }
        
        const currentJson = JSON.stringify(canvas.toObject(['isPlaceholder', 'isGuide']));
        const incomingJson = JSON.stringify(incomingData);
        
        if (incomingJson !== currentJson) {
           isRemoteUpdate.current = true;
           canvas.loadFromJSON(incomingData).then(() => {
             drawSpineAndGuides(canvas);
             canvas.renderAll();
             isRemoteUpdate.current = false;
           }).catch(err => {
             console.error("Remote Fabric sync error:", err);
             isRemoteUpdate.current = false;
           });
        }
      }
    }, (error) => {
      console.error("Firestore sync error", error);
    });

    // Template and Gallery Events bound directly to the active canvas instance
    const handleTemplateApply = (e: any) => {
        const layout = e.detail;
        canvas.getObjects().forEach(obj => {
            if (!(obj as any).isGuide) canvas.remove(obj);
        });
        layout.objects.forEach((objData: any) => {
            let fabricObj;
            if (objData.type === 'rect') fabricObj = new Rect(objData);
            else if (objData.type === 'i-text') fabricObj = new IText(objData.text, objData);
            if (fabricObj) canvas.add(fabricObj);
        });
        canvas.renderAll();
        
        // Propagate state change & save immediately
        const json = canvas.toObject(['isPlaceholder', 'isGuide']);
        onStateChange?.(json);
        persistToDatabase(json);
    };

    const handleGalleryInsert = (e: any) => {
      const urls = e.detail;
      urls.forEach((url: string, index: number) => {
        FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
          img.scaleToWidth(250);
          img.left = 120 + (index * 60);
          img.top = 100 + (index * 40);
          canvas.add(img);
          canvas.setActiveObject(img);
          
          // Force active state update immediately
          const json = canvas.toObject(['isPlaceholder', 'isGuide']);
          onStateChange?.(json);
          persistToDatabase(json);
        });
      });
    };

    const handleBgSet = (e: any) => {
      const url = e.detail;
      FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
        // Scale to fully cover double spread sheet
        img.set({
          left: 0,
          top: 0,
          scaleX: SPREAD_WIDTH / img.width!,
          scaleY: PAGE_HEIGHT / img.height!,
          selectable: false,
          evented: false
        });
        (img as any).isBg = true;
        
        // Remove existing background image if any
        canvas.getObjects().forEach(obj => {
          if ((obj as any).isBg) canvas.remove(obj);
        });

        canvas.add(img);
        canvas.sendObjectToBack(img);
        
        // Keep guide lines on top
        canvas.getObjects().forEach(obj => {
          if ((obj as any).isGuide) canvas.bringObjectToFront(obj);
        });

        canvas.renderAll();
        
        // Force active state update immediately
        const json = canvas.toObject(['isPlaceholder', 'isGuide']);
        onStateChange?.(json);
        persistToDatabase(json);
      });
    };

    window.addEventListener('apply-template', handleTemplateApply);
    window.addEventListener('insert-gallery-images', handleGalleryInsert);
    window.addEventListener('set-spread-background-image', handleBgSet);

    return () => {
      canvasElement.removeEventListener('drop', handleDrop);
      window.removeEventListener('apply-template', handleTemplateApply);
      window.removeEventListener('insert-gallery-images', handleGalleryInsert);
      window.removeEventListener('set-spread-background-image', handleBgSet);
      canvas.dispose();
      unsubscribe();
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [projectId, pageId, type, SPREAD_WIDTH, PAGE_HEIGHT, handleUpdate, persistToDatabase, onStateChange]);

  // Handle responsive scaling
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const padding = 64;
      const availableWidth = containerRef.current.clientWidth - padding;
      const targetWidth = SPREAD_WIDTH;
      if (availableWidth < targetWidth) {
        setScale(availableWidth / targetWidth);
      } else {
        setScale(1);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [SPREAD_WIDTH]);

  // Handle guide visibility
  useEffect(() => {
    if (fabricCanvas.current) {
      const c = fabricCanvas.current;
      c.getObjects().forEach(obj => {
        if ((obj as any).isGuide && (obj.stroke !== 'rgba(0,0,0,0.1)')) {
          obj.set('visible', showGuides);
        }
      });
      c.renderAll();
    }
  }, [showGuides]);

  const addText = () => {
    const text = new IText('Chapter One', {
      left: 100,
      top: 100,
      fontFamily: 'Playfair Display',
      fontSize: 40,
      fill: '#18181b'
    });
    fabricCanvas.current?.add(text);
    fabricCanvas.current?.setActiveObject(text);
  };

  const addFrame = () => {
    const rect = new Rect({
      left: 200,
      top: 200,
      width: 300,
      height: 200,
      fill: 'rgba(0,0,0,0.05)',
      stroke: '#e4e4e7',
      strokeWidth: 1,
      rx: 4,
      ry: 4,
    });
    fabricCanvas.current?.add(rect);
    fabricCanvas.current?.setActiveObject(rect);
  };

  const clearCanvas = () => {
    if (confirm('Clear entire spread?')) {
      fabricCanvas.current?.getObjects().forEach(obj => {
        if (!(obj as any).isGuide) fabricCanvas.current?.remove(obj);
      });
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-12 items-center w-full max-w-full overflow-hidden p-4 md:p-8">
      <div 
        className="relative group transition-transform duration-300 ease-out origin-center"
        style={{ transform: `scale(${scale * zoom})` }}
      >
        {/* Zoom Controls Overlay */}
        <div className="absolute -top-16 right-0 flex items-center gap-2 glass px-3 py-1.5 rounded-full border-white/5 opacity-0 group-hover:opacity-100 transition-opacity z-[60]">
            <button onClick={() => handleZoom(-0.1)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-[10px] font-mono text-zinc-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => handleZoom(0.1)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
            <div className="w-px h-3 bg-white/10 mx-1" />
            <button onClick={() => setZoom(1)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"><Focus className="w-4 h-4" /></button>
        </div>

        {/* Background Color Picker Overlay */}
        <div className="absolute -bottom-16 left-0 flex items-center gap-2 glass px-3 py-1.5 rounded-full border-white/5 opacity-0 group-hover:opacity-100 transition-opacity z-[60]">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-2">Paper Color</span>
            {['#ffffff', '#fdfcf0', '#fafaf9', '#f3f4f6', '#18181b'].map(color => (
                <button 
                  key={color}
                  onClick={() => setSpreadBg(color)}
                  className={cn(
                    "w-5 h-5 rounded-full border border-white/10 transition-transform hover:scale-125",
                    spreadBg === color && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950"
                  )}
                  style={{ backgroundColor: color }}
                />
            ))}
        </div>

        {/* Shadow "Thickness" Effect */}
        <div className="absolute inset-x-0 -bottom-4 h-4 bg-black/40 blur-2xl rounded-full opacity-50" />
        
        <div className="relative shadow-2xl border border-white/10 rounded-sm overflow-hidden bg-white/90 backdrop-blur-sm p-[2px]">
          <canvas ref={canvasRef} id="main-canvas" className="shadow-inner" />
          
          {/* Tactile Texture Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }} />

          {/* Spine Highlight */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-16 bg-gradient-to-r from-black/5 via-transparent to-black/5 pointer-events-none" />
        </div>

        {/* Floating Spread Indicators */}
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="text-[10px] font-bold text-zinc-600 vertical-text py-4 border-l border-white/10 uppercase tracking-widest leading-none">LEFT PAGE</div>
        </div>
        <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="text-[10px] font-bold text-zinc-600 vertical-text py-4 border-r border-white/10 uppercase tracking-widest leading-none">RIGHT PAGE</div>
        </div>
      </div>
      
      <motion.div 
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-0.5 p-1.5 glass-dark rounded-[2.5rem] border border-white/10 shadow-3xl fixed bottom-24 md:bottom-8 z-50 overflow-hidden"
      >
        <div className="flex items-center px-4 gap-2 border-r border-white/5 mr-1">
           <button 
             onClick={undo}
             disabled={historyIndex <= 0}
             className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 disabled:opacity-20 transition-all"
           >
              <Undo2 className="w-4 h-4 text-white" />
           </button>
           <button 
             onClick={redo}
             disabled={historyIndex >= history.length - 1}
             className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 disabled:opacity-20 transition-all"
           >
              <Redo2 className="w-4 h-4 text-white" />
           </button>
        </div>

        <button 
          onClick={addFrame}
          className="flex flex-col items-center gap-1 px-4 md:px-6 py-3 md:py-4 hover:bg-white/5 rounded-[2rem] transition-all"
        >
          <Square className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
          <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">Frame</span>
        </button>

        <button 
          onClick={addText}
          className="flex flex-col items-center gap-1 px-4 md:px-6 py-3 md:py-4 hover:bg-white/5 rounded-[2rem] transition-all"
        >
          <Type className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
          <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">Text</span>
        </button>

        <div className="w-px h-8 md:h-10 bg-white/5 mx-0.5" />

        <div className="flex items-center px-4 gap-2 border-r border-white/5 mr-1">
           <button 
             onClick={bringToFront}
             className="w-10 h-10 flex flex-col items-center justify-center rounded-full hover:bg-white/5 transition-all text-zinc-500 hover:text-white"
             title="Bring to Front"
           >
              <Layers className="w-4 h-4 rotate-180" />
              <span className="text-[6px] font-bold mt-0.5 uppercase">Front</span>
           </button>
           <button 
             onClick={sendToBack}
             className="w-10 h-10 flex flex-col items-center justify-center rounded-full hover:bg-white/5 transition-all text-zinc-500 hover:text-white"
             title="Send to Back"
           >
              <Layers className="w-4 h-4" />
              <span className="text-[6px] font-bold mt-0.5 uppercase">Back</span>
           </button>
        </div>

        <button 
          onClick={() => setShowGuides(!showGuides)}
          className={cn(
            "flex flex-col items-center gap-1 px-4 md:px-6 py-3 md:py-4 rounded-[2rem] transition-all",
            showGuides ? "bg-indigo-500/10 text-indigo-400" : "hover:bg-white/5 text-zinc-400"
          )}
        >
          <Eye className="w-4 h-4 md:w-5 md:h-5" />
          <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] opacity-80">{showGuides ? (window.innerWidth < 768 ? 'ON' : 'Guides ON') : (window.innerWidth < 768 ? 'OFF' : 'Guides OFF')}</span>
        </button>

        <div className="w-px h-8 md:h-10 bg-white/5 mx-0.5" />

        <button 
          onClick={clearCanvas}
          className="flex flex-col items-center gap-1 px-4 md:px-6 py-3 md:py-4 hover:bg-red-500/10 rounded-[2rem] transition-all group"
        >
          <Trash2 className="w-4 h-4 md:w-5 md:h-5 text-zinc-500 group-hover:text-red-400" />
          <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-red-400">Clear</span>
        </button>
      </motion.div>

      <style>{`
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  );
};

export default CanvasEditor;
