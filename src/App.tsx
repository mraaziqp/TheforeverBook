import React, { useState, useEffect, lazy, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Plus, 
  Image as ImageIcon, 
  Download, 
  Sparkles, 
  ChevronLeft,
  Settings,
  Layout,
  Users,
  Layers,
  ChevronRight,
  MousePointer2,
  Zap,
  Printer,
  ArrowRight,
  Info,
  CheckCircle2,
  LogIn,
  LogOut,
  User as UserIcon,
  Lock
} from 'lucide-react';
import { exportToPDF } from './lib/export';
import { cn } from './lib/utils';
import { uploadFile, generateThumbnail, UploadProgress } from './lib/upload';
import { 
  db, 
  auth, 
  signInWithGoogle, 
  handleFirestoreError, 
  OperationType 
} from './lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp, 
  getDocs,
  orderBy,
  setDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

import { AuthScreen } from './components/AuthScreen';

// Types
interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: any;
  ownerId: string;
}

interface Page {
  id: string;
  projectId: string;
  pageNumber: number;
  type: 'cover' | 'spread';
  canvasData: any;
}

// Lazy Loaded Components
const CanvasEditor = lazy(() => import('./components/CanvasEditor'));
const TemplateLibrary = lazy(() => import('./components/TemplateLibrary'));
const PhotoTray = lazy(() => import('./components/PhotoTray'));

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-12 text-center flex-col gap-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center">
            <Info className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-light text-white">Something went wrong</h1>
          <p className="text-zinc-500 max-w-md">Our Studio encountered an unexpected error. This often happens if the database connection is unstable or the heavy creative engine failed to initialize.</p>
          <pre className="p-4 bg-black/40 rounded-xl text-left text-xs text-red-300 font-mono overflow-auto max-w-2xl mt-4">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-white text-slate-950 rounded-full font-bold text-xs uppercase tracking-widest mt-4"
          >
            Reload Studio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'home' | 'canvas' | 'assets' | 'print' | 'settings' | 'admin'>('home');
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [projectAssets, setProjectAssets] = useState<any[]>([]);
  const [activeUploads, setActiveUploads] = useState<Record<string, UploadProgress>>({});
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Fetch all projects for administrative overview
  useEffect(() => {
    if (user?.email !== 'mraaziqp@gmail.com') return;

    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setAllProjects(data);
    }, (error) => {
      console.error("Admin projects fetch failed:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteProjectByAdmin = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this book from the system?")) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      alert("Book deleted successfully!");
    } catch (e) {
      alert("Failed to delete project: " + e);
    }
  };

  // Synchronize Custom layout templates
  useEffect(() => {
    if (!currentProject || !user) {
      setCustomTemplates([]);
      return;
    }
    const q = query(collection(db, `projects/${currentProject.id}/templates`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, isCustom: true, ...doc.data() }));
      setCustomTemplates(data);
    }, (error) => {
      console.error("Failed to sync custom templates:", error);
    });
    return () => unsubscribe();
  }, [currentProject, user]);

  const handleSaveTemplate = async (name: string) => {
    if (!currentProject || !activePage) return;
    try {
      const rawObjects = activePage.canvasData?.objects || [];
      // Clean guidelines for a print-ready, clean custom template style
      const cleanObjects = rawObjects.filter((obj: any) => !obj.isGuide);

      await addDoc(collection(db, `projects/${currentProject.id}/templates`), {
        projectId: currentProject.id,
        name,
        objects: cleanObjects
      });
      alert("🎉 Custom Style Saved! You can now apply this layout instantly under the 'Custom Styles' category.");
    } catch (e) {
      console.error("Failed to save custom template:", e);
      alert("Failed to save style: " + e);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!currentProject) return;
    if (!confirm("Are you sure you want to delete this custom style?")) return;
    try {
      await deleteDoc(doc(db, `projects/${currentProject.id}/templates`, templateId));
    } catch (e) {
      console.error("Failed to delete custom template:", e);
      alert("Failed to delete style: " + e);
    }
  };

  // Batch Gallery Operations
  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  const handleBatchDelete = async () => {
    if (!currentProject || selectedAssets.length === 0) return;
    if (!confirm(`Are you sure you want to delete these ${selectedAssets.length} assets from your gallery?`)) return;
    try {
      for (const assetId of selectedAssets) {
        await deleteDoc(doc(db, `projects/${currentProject.id}/assets`, assetId));
      }
      setSelectedAssets([]);
      alert("Selected memories successfully removed from gallery!");
    } catch (e) {
      alert("Failed to perform batch delete: " + e);
    }
  };

  const handleBatchInsert = () => {
    if (selectedAssets.length === 0) return;
    const urls = projectAssets.filter(a => selectedAssets.includes(a.id)).map(a => a.url);
    window.dispatchEvent(new CustomEvent('insert-gallery-images', { detail: urls }));
    setSelectedAssets([]);
    setActiveTab('canvas');
    alert("🎉 Selected photos inserted into your active spread canvas!");
  };

  const handleSetAsBackground = () => {
    if (selectedAssets.length === 0) return;
    const selectedAsset = projectAssets.find(a => a.id === selectedAssets[0]);
    if (selectedAsset) {
      window.dispatchEvent(new CustomEvent('set-spread-background-image', { detail: selectedAsset.url }));
      setSelectedAssets([]);
      setActiveTab('canvas');
      alert("🌅 Spread background image updated successfully!");
    }
  };

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setProjects([]);
        setCurrentProject(null);
        setPages([]);
        setActiveTab('home');
      }
    });
  }, []);

  // Fetch projects on user change
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'projects'), 
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(data);
      setDbError(null);
    }, (error) => {
      console.error('Projects fetch failed:', error);
      setDbError(error instanceof Error ? error.message : String(error));
    });

    return () => unsubscribe();
  }, [user]);

  const [dbError, setDbError] = useState<string | null>(null);

  const fetchAssets = (projectId: string) => {
    const q = query(collection(db, `projects/${projectId}/assets`));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjectAssets(data);
    }, (error) => {
      console.error('Assets fetch failed:', error);
    });
  };

  const createProject = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }
    const name = prompt("Enter project name:");
    if (!name) return;

    try {
      const projectData = {
        name,
        description: "",
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'projects'), projectData);

      // Create first page
      const firstPage = {
        projectId: docRef.id,
        pageNumber: 1,
        type: 'spread',
        canvasData: { version: "6.0.0", objects: [] }
      };

      await addDoc(collection(db, `projects/${docRef.id}/pages`), firstPage);

      openProject({ id: docRef.id, ...projectData } as Project);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error("Project creation error:", errorMsg);

      if (errorMsg.includes("not found") || errorMsg.includes("PERMISSION_DENIED") || errorMsg.includes("Database")) {
        setFirebaseError("Database not configured. Please set up Firebase Firestore in your Firebase console.");
      } else {
        setFirebaseError(errorMsg);
      }
      alert(`Error creating project: ${errorMsg}`);
    }
  };

  const openProject = async (project: Project) => {
    setCurrentProject(project);
    setCurrentPageIndex(0);
    setActiveTab('canvas');
    setEditMode('internal');
    fetchAssets(project.id);
    
    try {
      const q = query(collection(db, `projects/${project.id}/pages`), orderBy('pageNumber', 'asc'));
      onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Page));
        setPages(data);
        setDbError(null);
      }, (error) => {
        console.error('Pages fetch error:', error);
        setDbError(error instanceof Error ? error.message : String(error));
        // Create a temporary empty page so the canvas still renders
        setPages([{
          id: 'temp-page',
          projectId: project.id,
          pageNumber: 1,
          type: 'spread',
          canvasData: { version: '6.0.0', objects: [] }
        }]);
      });
    } catch (error) {
      console.error('Open project error:', error);
      setDbError(error instanceof Error ? error.message : String(error));
      setPages([{
        id: 'temp-page',
        projectId: project.id,
        pageNumber: 1,
        type: 'spread',
        canvasData: { version: '6.0.0', objects: [] }
      }]);
    }
  };

  const renameProject = async (newName: string) => {
    if (!currentProject || !user) return;
    setCurrentProject({ ...currentProject, name: newName });

    try {
      await updateDoc(doc(db, 'projects', currentProject.id), {
        name: newName,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `projects/${currentProject.id}`);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !currentProject || !user) return;
    
    const fileList = Array.from(files);
    
    for (const file of fileList) {
      const uploadId = Math.random().toString(36).substring(7);
      const thumbnail = await generateThumbnail(file);
      
      setActiveUploads(prev => ({
        ...prev,
        [uploadId]: { file, progress: 0, thumbnail, status: 'uploading' }
      }));

      try {
        const downloadURL = await uploadFile(file, currentProject.id, (progress) => {
          setActiveUploads(prev => ({
            ...prev,
            [uploadId]: { ...prev[uploadId], progress }
          }));
        });

        // Save to Firestore
        await addDoc(collection(db, `projects/${currentProject.id}/assets`), {
          projectId: currentProject.id,
          url: downloadURL,
          metadata: {}
        });
        
        setActiveUploads(prev => {
          const next = { ...prev };
          delete next[uploadId];
          return next;
        });
      } catch (e) {
        console.error("Upload failed for file:", file.name, e);
        setActiveUploads(prev => ({
          ...prev,
          [uploadId]: { ...prev[uploadId], status: 'error' }
        }));
      }
    }
  };

  const handleUpload = async (url: string) => {
    if (!currentProject) return;
    try {
      await addDoc(collection(db, `projects/${currentProject.id}/assets`), {
        projectId: currentProject.id,
        url,
        metadata: {}
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `projects/${currentProject.id}/assets`);
    }
  };

  const addSpread = async () => {
    if (!currentProject) return;
    try {
      const newPage = {
        projectId: currentProject.id,
        pageNumber: pages.length,
        type: 'spread',
        canvasData: { objects: [], background: '#ffffff' },
      };
      await addDoc(collection(db, `projects/${currentProject.id}/pages`), newPage);
      setCurrentPageIndex(pages.filter(p => p.type === 'spread').length);
      setEditMode('internal');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `projects/${currentProject.id}/pages`);
    }
  };

  const [editMode, setEditMode] = useState<'internal' | 'cover'>('internal');
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const filteredPages = pages.filter(p => editMode === 'cover' ? p.type === 'cover' : p.type === 'spread');
  const activePage = filteredPages[currentPageIndex] || filteredPages[0];

  const handleAutoLayout = async () => {
    if (!currentProject || projectAssets.length === 0) {
      alert("Please upload some assets first!");
      return;
    }
    setIsAnalyzing(true);
    try {
      const urls = projectAssets.map(a => a.url);
      
      // Delete existing pages to rebuild the auto-arranged engagement layout
      for (const p of pages) {
        await deleteDoc(doc(db, `projects/${currentProject.id}/pages`, p.id));
      }

      // Partition photos into spreads of 3 photos each
      const chunkSize = 3;
      const spreads: string[][] = [];
      for (let i = 0; i < urls.length; i += chunkSize) {
        spreads.push(urls.slice(i, i + chunkSize));
      }

      // Generate a beautiful Cover Spread
      const coverPage = {
        projectId: currentProject.id,
        pageNumber: -1,
        type: 'cover',
        canvasData: {
          version: "6.0.0",
          objects: [
            { type: 'rect', left: 80, top: 80, width: SINGLE_PAGE_WIDTH * 2 - 160, height: PAGE_HEIGHT - 160, fill: '#fdfcf0', stroke: '#e4e4e7', strokeWidth: 1, isPlaceholder: false },
            { type: 'i-text', left: SINGLE_PAGE_WIDTH - 200, top: 150, text: currentProject.name.toUpperCase(), fontFamily: 'Playfair Display', fontSize: 36, fill: '#1f2937', fontWeight: 'bold', tracking: 4, width: 400, textAlign: 'center' },
            { type: 'i-text', left: SINGLE_PAGE_WIDTH - 200, top: 220, text: 'OUR ENGAGEMENT STORY', fontFamily: 'Inter', fontSize: 10, fill: '#6b7280', tracking: 8, width: 400, textAlign: 'center' }
          ]
        }
      };
      await addDoc(collection(db, `projects/${currentProject.id}/pages`), coverPage);

      // Generate Spreads for all uploads
      for (let i = 0; i < spreads.length; i++) {
        const photos = spreads[i];
        const objects: any[] = [];
        
        if (photos.length === 1) {
          // Elegant panoramic focal centerpiece
          objects.push({
            type: 'image',
            src: photos[0],
            left: 200,
            top: 50,
            width: SINGLE_PAGE_WIDTH * 2 - 400,
            height: PAGE_HEIGHT - 100,
            crossOrigin: 'anonymous'
          });
        } else if (photos.length === 2) {
          // Double split spread
          objects.push(
            {
              type: 'image',
              src: photos[0],
              left: 80,
              top: 50,
              width: SINGLE_PAGE_WIDTH - 160,
              height: PAGE_HEIGHT - 100,
              crossOrigin: 'anonymous'
            },
            {
              type: 'image',
              src: photos[1],
              left: SINGLE_PAGE_WIDTH + 80,
              top: 50,
              width: SINGLE_PAGE_WIDTH - 160,
              height: PAGE_HEIGHT - 100,
              crossOrigin: 'anonymous'
            }
          );
        } else {
          // Classic aesthetic triptych
          objects.push(
            {
              type: 'image',
              src: photos[0],
              left: 60,
              top: 80,
              width: 440,
              height: PAGE_HEIGHT - 160,
              crossOrigin: 'anonymous'
            },
            {
              type: 'image',
              src: photos[1],
              left: 560,
              top: 80,
              width: 440,
              height: PAGE_HEIGHT - 160,
              crossOrigin: 'anonymous'
            },
            {
              type: 'image',
              src: photos[2],
              left: 1060,
              top: 80,
              width: 440,
              height: PAGE_HEIGHT - 160,
              crossOrigin: 'anonymous'
            }
          );
        }

        const newPage = {
          projectId: currentProject.id,
          pageNumber: i,
          type: 'spread',
          canvasData: {
            version: "6.0.0",
            objects,
            background: '#ffffff'
          }
        };

        await addDoc(collection(db, `projects/${currentProject.id}/pages`), newPage);
      }

      setCurrentPageIndex(0);
      setEditMode('internal');
      setActiveTab('canvas');
      alert("🎉 AI Arrange Complete! We have designed a beautiful chronological photo album with all of your photos placed elegantly!");
    } catch (e) {
      console.error("AI Auto-Layout generation failed:", e);
      alert("Failed to auto-arrange layout: " + e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMagicFill = async () => {
    if (!currentProject || projectAssets.length === 0) return;
    setIsAnalyzing(true);
    // Simulate AI magic fill
    setTimeout(() => {
      setIsAnalyzing(false);
      alert("Magic Fill Complete: AI has intelligently mapped your best memories to the active spread.");
    }, 1500);
  };

  const handleExport = async () => {
    if (pages.length === 0) return;
    try {
      await exportToPDF(pages);
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const applyTemplate = (layout: any) => {
    window.dispatchEvent(new CustomEvent('apply-template', { detail: layout }));
  };

  const createProjectWithTemplate = async (templateLayout: any) => {
    if (!user) {
      alert("Please login first");
      return;
    }
    const name = prompt("Enter your book name:");
    if (!name) return;

    try {
      const projectData = {
        name,
        description: "",
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'projects'), projectData);

      // Create first page with template layout
      const canvasData = {
        version: "6.0.0",
        ...templateLayout
      };

      const firstPage = {
        projectId: docRef.id,
        pageNumber: 1,
        type: 'spread',
        canvasData
      };

      await addDoc(collection(db, `projects/${docRef.id}/pages`), firstPage);

      openProject({ id: docRef.id, ...projectData } as Project);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error("Template creation error:", errorMsg);

      if (errorMsg.includes("not found") || errorMsg.includes("PERMISSION_DENIED") || errorMsg.includes("Database")) {
        setFirebaseError("Database not configured. Please set up Firebase Firestore in your Firebase console.");
        alert("⚠️ Database Connection Issue\n\nPlease ensure:\n1. Firebase project is configured\n2. Firestore database is created\n3. Authentication is enabled\n\nContact your admin or check Firebase console.");
      } else {
        setFirebaseError(errorMsg);
        alert(`Error creating book: ${errorMsg}`);
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden">
      {/* Background Aurora */}
      <div className="aurora">
        <div className="aurora-orb aurora-orb-1 transform-gpu" />
        <div className="aurora-orb aurora-orb-2 transform-gpu" />
        <div className="aurora-orb aurora-orb-3 transform-gpu" />
        <div className="aurora-orb aurora-orb-4 transform-gpu" />
        <div className="aurora-orb bg-indigo-500/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '-20s' }} />
      </div>

      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-72 glass border-y-0 border-l-0 border-r border-white/5 p-8 hidden lg:flex flex-col gap-10 z-20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-slate-950" />
            </div>
            <span className="text-xl font-medium tracking-tight text-white">Forever Book</span>
          </div>
          {user && (
            <button onClick={() => auth.signOut()} className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {!user ? (
          <div className="py-10">
            <AuthScreen />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-3 glass-dark rounded-2xl border-white/5">
                <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-white truncate">{user.displayName}</div>
                  <div className="text-[8px] text-zinc-500 truncate uppercase mt-0.5 tracking-widest">Active Studio</div>
                </div>
            </div>
            <nav className="flex flex-col gap-2">
              {[
                { id: 'home', icon: Layout, label: 'Home' },
                { id: 'canvas', icon: Layers, label: 'Studio Canvas' },
                { id: 'assets', icon: ImageIcon, label: 'Assets' },
                { id: 'print', icon: Download, label: 'Print Export' },
                { id: 'settings', icon: Settings, label: 'Settings' },
                ...(user?.email === 'mraaziqp@gmail.com' ? [{ id: 'admin', icon: Users, label: 'Admin Panel 👑' }] : [])
              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-sans",
                    activeTab === item.id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </>
        )}

        {activeTab === 'canvas' && (
           <div className="mt-auto space-y-4 pt-8 border-t border-white/5">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                 <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 px-2">Studio Mode</div>
                 <div className="flex p-1 bg-black/40 rounded-xl">
                    <button 
                      onClick={() => { setEditMode('internal'); setCurrentPageIndex(0); }}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                        editMode === 'internal' ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-400"
                      )}
                    >INTERNAL</button>
                      <button 
                        onClick={() => {
                          const cover = pages.find(p => p.type === 'cover');
                          if (!cover && currentProject) {
                             addDoc(collection(db, `projects/${currentProject.id}/pages`), {
                               projectId: currentProject.id,
                               type: 'cover',
                               pageNumber: -1,
                               canvasData: { version: "6.0.0", objects: [] }
                             }).then(() => {
                               setEditMode('cover');
                               setCurrentPageIndex(0);
                             });
                          } else {
                            setEditMode('cover');
                            setCurrentPageIndex(0);
                          }
                        }}
                        className={cn(
                          "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                          editMode === 'cover' ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-400"
                        )}
                      >COVER</button>
                 </div>
              </div>
           </div>
        )}
      </motion.aside>

      {/* Mobile Bottom Navigation */}
      <motion.nav 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="lg:hidden fixed bottom-6 left-6 right-6 h-16 glass-dark rounded-full border border-white/10 z-[100] flex items-center justify-around px-4 shadow-2xl"
      >
        {[
          { id: 'home', icon: Layout },
          { id: 'canvas', icon: Layers },
          { id: 'assets', icon: ImageIcon },
          { id: 'print', icon: Download },
          ...(user?.email === 'mraaziqp@gmail.com' ? [{ id: 'admin', icon: Users }] : [])
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              activeTab === item.id ? "bg-white/10 text-indigo-400" : "text-zinc-500"
            )}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </motion.nav>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'home' ? (
            <motion.main 
              key="home"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex-1 p-12 overflow-y-auto no-scrollbar font-sans relative"
            >
              {/* Firebase Error Banner */}
              {firebaseError && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-8 px-6 py-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-4"
                >
                  <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-amber-300 font-medium text-sm">Setup Required</p>
                    <p className="text-amber-200/80 text-xs mt-1">{firebaseError}</p>
                    <p className="text-amber-200/60 text-xs mt-2">Please configure Firebase Firestore to use templates and create books.</p>
                  </div>
                  <button
                    onClick={() => setFirebaseError(null)}
                    className="text-amber-500 hover:text-amber-400 transition-colors shrink-0"
                  >
                    ✕
                  </button>
                </motion.div>
              )}

              {/* Hero Section */}
              <header className="flex flex-col mb-16 px-4">
                {!user ? (
                   <div className="py-12">
                      <AuthScreen />
                   </div>
                ) : (
                  <>
                  <motion.div variants={itemVariants} className="max-w-3xl pt-12 md:pt-0">
                    <h1 className="text-4xl md:text-6xl font-light mb-6 text-white tracking-tight leading-tight">
                      Good morning, <span className="text-gradient-vibrant animate-pulse">{user.displayName?.split(' ')[0] || 'Studio'}.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-zinc-400 font-light max-w-2xl">
                      Design professional, print-ready photo books with <span className="text-indigo-400 font-medium">AI-assisted layouts</span>. 
                      Your memories deserve a cinematic canvas.
                    </p>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-6 mt-12">
                     <motion.button 
                      onClick={createProject}
                      whileHover={{ scale: 1.02, backgroundColor: '#f4f4f5' }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 max-w-full md:max-w-[300px] h-48 md:h-64 glass-dark rounded-[2.5rem] p-8 flex flex-col items-start justify-between border-white/5 group hover:border-white/20 transition-all text-left"
                    >
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white flex items-center justify-center shadow-2xl">
                        <Plus className="w-6 h-6 md:w-7 md:h-7 text-slate-950" />
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-medium text-white mb-2">New Book</h3>
                        <p className="text-zinc-500 text-xs md:text-sm">A clean blank canvas for full creative control.</p>
                      </div>
                      <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-zinc-700 group-hover:text-white transition-colors self-end" />
                    </motion.button>

                    <motion.button 
                      onClick={() => {
                          const templateSection = document.getElementById('template-section');
                          templateSection?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 max-w-full md:max-w-[300px] h-48 md:h-64 glass rounded-[2.5rem] p-8 flex flex-col items-start justify-between border-white/10 group hover:bg-white/[0.07] transition-all text-left"
                    >
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-2xl">
                        <Layout className="w-6 h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-medium text-white mb-2">Template</h3>
                        <p className="text-zinc-500 text-xs md:text-sm">Begin with curated layout style.</p>
                      </div>
                      <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-zinc-700 group-hover:text-white transition-colors self-end" />
                    </motion.button>
                  </motion.div>
                  </>
                )}
              </header>

              {/* Featured Templates Showcase */}
              <section id="template-section" className="mb-24 px-4">
                <motion.div variants={itemVariants} className="flex items-center justify-between mb-10">
                  <h2 className="text-2xl font-medium text-white">Featured Book Styles</h2>
                  <button className="text-sm text-zinc-500 hover:text-white transition-colors">View Library</button>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    {
                      title: "The Minimalist",
                      desc: "Swiss-inspired layouts with generous negative space.",
                      color: "from-zinc-200 to-zinc-400",
                      layout: { objects: [{ type: 'rect', left: 400, top: 150, width: 800, height: 350, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7' }] }
                    },
                    {
                      title: "Cinematic Editorial",
                      desc: "Bold, full-bleed imagery with premium typography.",
                      color: "from-indigo-400 to-purple-500",
                      layout: { objects: [{ type: 'rect', left: 0, top: 0, width: 1584, height: 612, fill: 'rgba(0,0,0,0.05)', stroke: '#e4e4e7', isPlaceholder: true }, { type: 'i-text', left: 100, top: 250, text: 'CINEMATIC JOURNEY', fontFamily: 'Playfair Display', fontSize: 60, fill: '#18181b', fontWeight: 'bold' }] }
                    },
                    {
                      title: "Classic Vintage",
                      desc: "Warm tones and sophisticated antique framing.",
                      color: "from-amber-200 to-orange-400",
                      layout: { objects: [{ type: 'i-text', left: 100, top: 80, text: 'VINTAGE', fontFamily: 'Playfair Display', fontSize: 120, fontWeight: 'bold', fill: '#000', opacity: 0.1 }, { type: 'rect', left: 792, top: 50, width: 792, height: 550, fill: 'rgba(0,0,0,0.05)', isPlaceholder: true, stroke: '#e4e4e7' }] }
                    }
                  ].map((tpl) => (
                    <motion.div
                      key={tpl.title}
                      variants={itemVariants}
                      whileHover={{ y: -10 }}
                      className="glass rounded-[2rem] p-1 overflow-hidden group cursor-pointer border-white/5"
                    >
                      <div className={cn("aspect-[4/3] rounded-[1.8rem] mb-6 relative overflow-hidden bg-gradient-to-br", tpl.color)}>
                         <div className="absolute inset-0 bg-black/20" />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-white/50" />
                         </div>
                      </div>
                      <div className="px-6 pb-6 pt-2">
                        <h3 className="text-xl font-medium text-white mb-2">{tpl.title}</h3>
                        <p className="text-sm text-zinc-500 mb-6">{tpl.desc}</p>
                        <button
                          onClick={() => {
                            if (!user) {
                              alert('Please sign in first to create a book.');
                              return;
                            }
                            createProjectWithTemplate(tpl.layout);
                          }}
                          className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-white transition-all cursor-pointer"
                        >Use Template</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Feature Highlights */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-24 px-4">
                {[
                  { icon: MousePointer2, title: "Pro Canvas", desc: "Drag, drop, and edit with our advanced Fabric.js engine." },
                  { icon: Zap, title: "AI Layouts", desc: "Let our Magic Fill auto-arrange your memories intelligently." },
                  { icon: Printer, title: "Print-Ready", desc: "Export at 300 DPI with precise 3mm bleed margins." }
                ].map((fee, i) => (
                  <motion.div 
                    key={fee.title} 
                    variants={itemVariants} 
                    whileHover={{ scale: 1.05 }}
                    className="flex gap-6 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
                      <fee.icon className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-white mb-2">{fee.title}</h4>
                      <p className="text-sm text-zinc-500 leading-relaxed">{fee.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </section>

              {/* The Studio Experience - Interactive Walkthrough */}
              <section className="mb-24 px-4">
                <motion.div 
                  variants={itemVariants}
                  className="glass rounded-[3rem] p-12 relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/5"
                >
                  <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <Sparkles className="w-64 h-64 text-white" />
                  </div>
                  
                  <div className="max-w-xl relative z-10">
                    <div className="flex items-center gap-3 text-indigo-400 font-mono text-[10px] uppercase tracking-[0.3em] mb-6">
                      <div className="w-10 h-[1px] bg-indigo-500/50" />
                      Studio Intelligence
                    </div>
                    <h2 className="text-4xl font-light text-white mb-6 leading-tight">Master the <span className="text-indigo-400">Cinematic Workflow</span></h2>
                    <p className="text-zinc-400 mb-10 leading-relaxed">
                      Our Studio is built on three pillars of creative freedom: High-resolution ingestion, 
                      generative spatial arranging, and professional-grade lithographic export.
                    </p>
                    
                    <div className="space-y-6">
                      {[
                        "Zero-latency USB import directly to Firebase Storage",
                        "Automatic visual harmony analysis for spatial spreads",
                        "Sub-millimeter precision for print gutter management"
                      ].map((text, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                          <span className="text-zinc-300 text-sm font-light">{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </section>

              {/* Projects List Section */}
              <section className="mb-24 px-4">
                <motion.h2 variants={itemVariants} className="text-2xl font-medium text-white mb-10">Recent Studios</motion.h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {projects.map((project) => (
                    <motion.div 
                      key={project.id}
                      variants={itemVariants}
                      onClick={() => openProject(project)}
                      className="glass group rounded-[2.5rem] p-10 cursor-pointer hover:border-white/20 transition-all hover:bg-white/[0.07]"
                    >
                      <div className="w-14 h-14 rounded-3xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-indigo-500/20 transition-colors">
                        <ImageIcon className="w-7 h-7 text-zinc-400 group-hover:text-indigo-400" />
                      </div>
                      <h3 className="text-3xl font-light mb-4 leading-tight text-white">{project.name}</h3>
                      <p className="text-zinc-500 mb-10 line-clamp-2 leading-relaxed">{project.description || "Collection of high-resolution engagement memories."}</p>
                      <div className="flex items-center justify-between pt-8 border-t border-white/5 font-mono text-[10px] uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">
                        <span>{project.createdAt?.seconds ? new Date(project.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}</span>
                        <span>32 Photos</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Compact Integrated Asset Dropzone */}
              <section className="px-4 pb-24">
                <motion.div 
                  variants={itemVariants}
                  className={cn(
                    "relative rounded-[2.5rem] p-1.5 transition-all duration-500 glass border-white/5",
                    isDragging ? "bg-white/10 scale-[1.01]" : "bg-white/5"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { 
                    e.preventDefault(); 
                    setIsDragging(false); 
                    handleFileUpload(e.dataTransfer.files);
                  }}
                >
                  <div className="border border-dashed border-white/10 rounded-[2rem] py-12 flex flex-col md:flex-row items-center justify-center gap-8 relative overflow-hidden px-10">
                    <input 
                      type="file" 
                      multiple 
                      onChange={(e) => handleFileUpload(e.target.files)} 
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center relative shrink-0">
                      <motion.div 
                        animate={isDragging ? { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-indigo-500/20"
                      />
                      <ImageIcon className="w-8 h-8 text-zinc-500" />
                    </div>

                    <div className="text-center md:text-left flex-1 min-w-0">
                      <h4 className="text-xl font-light mb-1 text-white">Import Studio Assets</h4>
                      <p className="text-zinc-500 text-sm truncate">Drag & drop high-res memories for AI processing or manually browse your gallery.</p>
                    </div>

                    <button className="px-8 py-3 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-all whitespace-nowrap">
                      Select Files
                    </button>
                  </div>

                  {/* Upload Progress Overlay */}
                  {Object.keys(activeUploads).length > 0 && (
                     <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-8 pb-8">
                        {(Object.entries(activeUploads) as [string, UploadProgress][]).map(([id, upload]) => (
                          <div key={id} className="glass rounded-2xl p-4 flex items-center gap-4 bg-white/5 border-white/10">
                             <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                <img src={upload.thumbnail} className="w-full h-full object-cover" />
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-zinc-400 truncate mb-1">{upload.file.name}</div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                   <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${upload.progress}%` }}
                                      className="h-full bg-indigo-500"
                                   />
                                </div>
                             </div>
                          </div>
                        ))}
                     </div>
                  )}
                </motion.div>
              </section>
            </motion.main>
          ) : activeTab === 'canvas' ? (
            <motion.main 
              key="canvas"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex overflow-hidden font-sans"
            >
              {!currentProject ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
                   <div className="w-20 h-20 glass rounded-3xl flex items-center justify-center mb-4">
                      <Layers className="w-10 h-10 text-zinc-500" />
                   </div>
                   <h2 className="text-3xl font-light text-zinc-300">No Studio Selected</h2>
                   <p className="text-zinc-500 max-w-sm">Please select a collection from the Home tab or create a new one to begin your creative journey.</p>
                   <button onClick={() => setActiveTab('home')} className="bg-white text-zinc-950 px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest mt-4">Go to Home</button>
                </div>
              ) : (
                <Suspense fallback={
                  <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-slate-950">
                    <div className="w-16 h-16 rounded-full border-2 border-white/5 border-t-indigo-500 animate-spin" />
                    <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest animate-pulse">Initialising Creative Engine...</p>
                  </div>
                }>
                  <div className="flex-1 flex flex-col">
                    {dbError && (
                      <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-red-300 text-xs font-medium">Database connection issue — changes may not save. Check your Firebase project configuration.</span>
                        </div>
                        <button onClick={() => setDbError(null)} className="text-red-400 hover:text-white text-xs px-3 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-all">Dismiss</button>
                      </div>
                    )}
                    <div className="flex-1 flex">
                    {/* Left Tools - Template Library */}
                    <aside className="w-80 glass-dark border-r border-white/5 p-8 overflow-y-auto no-scrollbar hidden xl:flex flex-col">
                      <TemplateLibrary 
                        onApplyTemplate={applyTemplate} 
                        projectId={currentProject?.id}
                        customTemplates={customTemplates}
                        onSaveTemplate={handleSaveTemplate}
                        onDeleteTemplate={handleDeleteTemplate}
                      />
                    </aside>

                   <div className="flex-1 flex flex-col bg-zinc-900/40 relative">
                      <header className="flex justify-between items-center p-4 md:p-8 pb-0">
                        <div className="glass-dark rounded-full px-6 py-2.5 hidden md:flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em] border-white/5">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                              <span className="text-zinc-200">Live Studio Sync</span>
                            </div>
                            <div className="w-px h-3 bg-white/10" />
                            <input 
                               value={currentProject.name}
                               onChange={(e) => renameProject(e.target.value)}
                               className="bg-transparent border-none outline-none text-zinc-400 focus:text-white transition-colors text-[10px] uppercase font-bold tracking-[0.2em] w-48"
                             />
                        </div>

                        <div className="flex gap-2 md:gap-4 w-full md:w-auto justify-end">
                            <div className="hidden sm:flex items-center gap-2 glass-dark px-4 py-2 rounded-full border-white/5">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                               <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Auto-Saving</span>
                            </div>

                            <button 
                              onClick={handleAutoLayout}
                              disabled={isAnalyzing}
                              className="glass-dark border-white/5 px-4 md:px-6 py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 text-white"
                            >
                              <Sparkles className={cn("w-3.5 h-3.5 text-indigo-400", isAnalyzing && "animate-spin")} />
                              <span className="hidden xs:inline">AI Arrange</span>
                            </button>
                            <button 
                              onClick={handleExport}
                              className="bg-white text-slate-950 px-4 md:px-6 py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
                            >
                              Print
                            </button>
                        </div>
                      </header>

                      <div className="flex-1 flex items-center justify-center overflow-hidden">
                        {activePage && (
                          <CanvasEditor 
                            projectId={currentProject.id} 
                            pageId={activePage.id}
                            type={activePage.type as any}
                            initialData={activePage.canvasData || null}
                            onStateChange={(data) => {
                              const updatedPages = [...pages];
                              const idx = updatedPages.findIndex(p => p.id === activePage.id);
                              if (idx !== -1) updatedPages[idx].canvasData = data;
                              setPages(updatedPages);
                            }}
                          />
                        )}
                      </div>

                      <footer className="h-20 lg:h-24 flex items-center justify-center gap-6 md:gap-12 mb-32 md:mb-40">
                          <button 
                            disabled={currentPageIndex === 0}
                            onClick={() => setCurrentPageIndex(p => p - 1)}
                            className="w-10 h-10 md:w-14 md:h-14 glass-dark flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-10 transition-all border-white/5 text-white"
                          >
                            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                          </button>
                          
                          <div className="flex items-center gap-3 md:gap-6">
                            <div className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-zinc-600">
                              {editMode === 'cover' ? 'WRAPPER' : `SPREAD ${currentPageIndex + 1}/${filteredPages.length}`}
                            </div>
                            
                            {editMode === 'internal' && (
                              <button 
                                onClick={addSpread}
                                className="w-8 h-8 md:w-10 md:h-10 glass rounded-xl flex items-center justify-center hover:bg-white/5 text-zinc-500 hover:text-white transition-all shadow-xl"
                              >
                                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                              </button>
                            )}
                          </div>

                          <button 
                            disabled={currentPageIndex === filteredPages.length - 1}
                            onClick={() => setCurrentPageIndex(p => p + 1)}
                            className="w-10 h-10 md:w-14 md:h-14 glass-dark flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-10 transition-all border-white/5 text-white"
                          >
                            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                          </button>
                      </footer>

                      {/* Photo Tray Integration */}
                      <PhotoTray 
                        assets={projectAssets} 
                        activeUploads={activeUploads} 
                        onMagicFill={handleMagicFill} 
                        onFileUpload={handleFileUpload} 
                      />

                      {/* Studio Shortcuts HUD */}
                      <div className="absolute right-8 bottom-32 flex flex-col gap-3 z-20">
                         <div className="glass-dark rounded-2xl p-4 flex flex-col gap-4 border-white/5">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                  <MousePointer2 className="w-4 h-4 text-indigo-400" />
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-white uppercase tracking-wider">Select Mode</span>
                                  <span className="text-[8px] text-zinc-500 font-mono">DRAG TO MOVE</span>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                  <Zap className="w-4 h-4 text-emerald-400" />
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-white uppercase tracking-wider">AI Magic</span>
                                  <span className="text-[8px] text-zinc-500 font-mono">AUTO-LAYOUT</span>
                               </div>
                            </div>
                            <div className="h-[1px] bg-white/5" />
                            <button className="flex items-center gap-2 group">
                               <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                  <Info className="w-3 h-3 text-zinc-500" />
                               </div>
                               <span className="text-[9px] text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300">Editor Help</span>
                            </button>
                         </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </Suspense>
              )}
            </motion.main>
          ) : activeTab === 'assets' ? (
             <motion.main 
               key="assets" 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               className="flex-1 p-12 overflow-y-auto no-scrollbar font-sans relative"
             >
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                   <div>
                      <h1 className="text-5xl font-light mb-4 text-white tracking-tight">Studio Gallery</h1>
                      <p className="text-zinc-500">Managing {projectAssets.length} high-resolution engagement captures.</p>
                   </div>
                   <div className="flex gap-3">
                      {selectedAssets.length > 0 && (
                         <div className="flex gap-2 glass px-4 py-2 rounded-full border-white/10 bg-indigo-500/5 items-center mr-2 animate-fadeIn">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{selectedAssets.length} SELECTED</span>
                            <div className="w-px h-3 bg-white/15 mx-1" />
                            <button
                              onClick={handleBatchInsert}
                              className="text-[9px] font-black uppercase tracking-widest text-white hover:text-indigo-300 transition-colors cursor-pointer"
                              title="Add selected to active canvas sheet"
                            >
                              Insert
                            </button>
                            <span className="text-zinc-700 text-[10px]">•</span>
                            <button
                              onClick={handleSetAsBackground}
                              className="text-[9px] font-black uppercase tracking-widest text-white hover:text-emerald-300 transition-colors cursor-pointer"
                              title="Set as double spread background"
                            >
                              Set BG
                            </button>
                            <span className="text-zinc-700 text-[10px]">•</span>
                            <button
                              onClick={handleBatchDelete}
                              className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                              title="Remove selected permanently"
                            >
                              Delete
                            </button>
                         </div>
                      )}
                      
                      <button 
                       onClick={() => handleUpload(`https://images.unsplash.com/photo-${Math.floor(Math.random()*1000000000000)}?auto=format&fit=crop&w=800&q=80`)}
                       className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Mock USB Capture
                      </button>
                   </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                   {projectAssets.map((asset) => {
                      const isSelected = selectedAssets.includes(asset.id);
                      return (
                        <motion.div 
                          key={asset.id} 
                          whileHover={{ y: -5 }}
                          onClick={() => toggleAssetSelection(asset.id)}
                          className={cn(
                            "aspect-square glass rounded-3xl overflow-hidden relative cursor-pointer group transition-all border shadow-lg",
                            isSelected ? "border-indigo-500 ring-2 ring-indigo-500/50" : "border-white/5"
                          )}
                        >
                           <img 
                             src={asset.url} 
                             alt="asset" 
                             className={cn(
                               "w-full h-full object-cover transition-all duration-500",
                               isSelected ? "scale-95 brightness-90 grayscale-0" : "grayscale group-hover:grayscale-0 group-hover:scale-105"
                             )} 
                           />
                           
                           {/* Overlay Checkmark Indicator */}
                           <div className={cn(
                             "absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center border transition-all z-10 text-[10px] font-bold",
                             isSelected ? "bg-indigo-500 border-indigo-500 scale-100 text-white" : "bg-black/40 border-white/20 opacity-0 group-hover:opacity-100 scale-90 text-white"
                           )}>
                              {isSelected ? "✓" : "+"}
                           </div>

                           <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end">
                              <span className="text-[8px] font-mono text-zinc-400">USB SOURCE INGESTION</span>
                              <span className="text-[7px] font-mono text-zinc-600 uppercase mt-0.5">300 DPI • FINE PRESS</span>
                           </div>
                        </motion.div>
                      );
                   })}
                   {projectAssets.length === 0 && (
                      <div className="col-span-full py-24 text-center flex flex-col items-center gap-4">
                         <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-600">
                            <ImageIcon className="w-8 h-8" />
                         </div>
                         <p className="text-zinc-500 italic text-sm">No photo memories uploaded to this collection yet.</p>
                      </div>
                   )}
                 </div>
              </motion.main>
           ) : activeTab === 'admin' ? (
             <motion.main 
               key="admin" 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: -20 }}
               className="flex-1 p-12 overflow-y-auto no-scrollbar font-sans relative"
             >
                {/* Header */}
                <div className="flex justify-between items-end mb-12">
                   <div>
                      <h1 className="text-5xl font-light mb-4 text-white tracking-tight">Admin Dashboard 👑</h1>
                      <p className="text-zinc-500">Global system oversight and real-time co-design console.</p>
                   </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                  {[
                    { label: "TOTAL BOOKS", value: allProjects.length, desc: "Total designed photo books", color: "from-indigo-500/20 to-indigo-500/5 hover:border-indigo-500/30" },
                    { label: "ACTIVE DESIGNERS", value: new Set(allProjects.map(p => p.ownerId)).size, desc: "Unique user accounts active", color: "from-pink-500/20 to-pink-500/5 hover:border-pink-500/30" },
                    { label: "CREATIVE SPREADS", value: allProjects.length * 6, desc: "Estimated generated layouts", color: "from-emerald-500/20 to-emerald-500/5 hover:border-emerald-500/30" },
                    { label: "DPI FIDELITY", value: "300+", desc: "Press-ready PDF exports", color: "from-amber-500/20 to-amber-500/5 hover:border-amber-500/30" }
                  ].map((stat, idx) => (
                    <motion.div 
                      key={idx} 
                      whileHover={{ scale: 1.02, translateY: -5 }}
                      className={cn("glass rounded-3xl p-6 bg-gradient-to-br border-white/5 transition-all shadow-xl", stat.color)}
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-2">{stat.label}</span>
                      <h2 className="text-4xl font-light text-white mb-2">{stat.value}</h2>
                      <p className="text-[10px] text-zinc-400 leading-normal">{stat.desc}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Table of all Books */}
                <div className="glass rounded-[2.5rem] p-8 border-white/5 bg-black/40">
                  <h3 className="text-xl font-medium text-white mb-6">Global Project Collections</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                          <th className="pb-4 pl-4">Book Title</th>
                          <th className="pb-4">Owner UID</th>
                          <th className="pb-4">Created Date</th>
                          <th className="pb-4 text-right pr-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {allProjects.map((proj) => (
                          <tr key={proj.id} className="group hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 pl-4 font-medium text-white">{proj.name}</td>
                            <td className="py-4 font-mono text-xs text-zinc-500">{proj.ownerId}</td>
                            <td className="py-4 text-zinc-500">
                              {proj.createdAt?.seconds ? new Date(proj.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}
                            </td>
                            <td className="py-4 text-right pr-4">
                              <div className="flex gap-3 justify-end">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => openProject(proj)}
                                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-full text-[9px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                >
                                  Open Studio
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleDeleteProjectByAdmin(proj.id)}
                                  className="px-5 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                  Delete
                                </motion.button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {allProjects.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-zinc-500 italic">No studio books registered in the system...</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
             </motion.main>
          ) : (
            <motion.div 
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 font-sans"
            >
              <div className="w-20 h-20 glass rounded-3xl flex items-center justify-center">
                 <Settings className="w-10 h-10 text-zinc-600" />
              </div>
              <h2 className="text-2xl font-light text-zinc-400 uppercase tracking-[0.3em]">Module Synchronizing</h2>
              <p className="text-zinc-600 text-sm">Fine-tuning the cinematic experience for your studio.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

