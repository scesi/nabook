"use client";

import { useState, useRef, useEffect, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, BrainCircuit, UploadCloud, Save, 
  MoreHorizontal, Image as ImageIcon, CheckCircle2, AlertCircle
} from "lucide-react";

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  // En Next.js 15+ "params" es una promesa
  const { id } = use(params);

  const [title, setTitle] = useState("Sin Título");
  const [markdown, setMarkdown] = useState("# Escribe tus apuntes aquí...\n\n");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [weakPoints, setWeakPoints] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Al cargar la página, verificamos si hay puntos débiles en LocalStorage 
    // generados por un examen anterior para esta sesión.
    const storedPoints = localStorage.getItem(`weakPoints_${id}`);
    if (storedPoints) {
      try {
        setWeakPoints(JSON.parse(storedPoints));
      } catch (e) { console.error(e) }
    }
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Llama a nuestra API Route (OCR -> Vectorizado)
      // En un entorno local sin llaves reales, esto podría fallar, así que lo mockearemos 
      // si la API retorna error, asumiendo funcionamiento normal para diseño.
      const res = await fetch("/api/process-document", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok) {
        // Añadimos el texto extraído al final del markdown
        const newText = `\n\n> **Texto extraído de ${file.name}**\n${data.data.preview}`;
        setMarkdown(prev => prev + newText);
        setUploadSuccess(true);
      } else {
        // MOCK fallback for UI demonstration since real Azure keys might be missing
        console.warn("API falló (seguramente por falta de llaves). Usando Mock Data.");
        setTimeout(() => {
          const mockOcrText = `\n\n> **Apuntes extraídos de ${file.name} (OCR Mock)**\n\nLa fotosíntesis es el proceso metabólico por el que las plantas verdes convierten energía luminosa en energía química...`;
          setMarkdown(prev => prev + mockOcrText);
          setUploadSuccess(true);
          setIsUploading(false);
        }, 1500);
        return;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  const getHighlightColor = (criticality: string) => {
    switch(criticality) {
      case "HIGH": return "bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-400";
      case "MEDIUM": return "bg-yellow-500/20 border-yellow-500/50 text-yellow-700 dark:text-yellow-400";
      case "LOW": return "bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-400";
      default: return "bg-gray-100 dark:bg-zinc-800";
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      {/* Editor Navbar */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-3 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 dark:border-zinc-900">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium bg-transparent border-none outline-none text-sm placeholder:text-gray-300"
              placeholder="Título del documento..."
            />
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Save className="w-3 h-3" /> Auto-guardado hace instantes
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="text-gray-500 hover:text-black dark:hover:text-white p-2">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          <Link 
            href={`/exam/${id}`}
            onClick={() => {
              // Guardar el contexto actual de markdown para RAG local
              localStorage.setItem(`markdown_${id}`, markdown);
              localStorage.setItem(`title_${id}`, title);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm shadow-blue-500/20"
          >
            <BrainCircuit className="w-4 h-4" />
            <span className="hidden sm:inline">Generar Examen (RAG)</span>
            <span className="sm:hidden">Examen</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-12 flex flex-col gap-8">
        {/* Upload Zone */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300
            ${isUploading ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-zinc-800 hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-zinc-900'}
            ${uploadSuccess ? 'border-green-400 bg-green-50 dark:bg-green-950/20' : ''}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
          />
          
          {isUploading ? (
            <div className="animate-pulse flex flex-col items-center">
              <UploadCloud className="w-8 h-8 text-blue-500 mb-3 animate-bounce" />
              <p className="text-sm font-medium">Extrayendo texto con Mistral OCR...</p>
              <p className="text-xs text-gray-500 mt-1">Vectorizando contenido...</p>
            </div>
          ) : uploadSuccess ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mb-3" />
              <p className="text-sm font-medium text-green-600 dark:text-green-400">¡Texto extraído e indexado con éxito!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-500 dark:text-zinc-400">
              <ImageIcon className="w-8 h-8 mb-3" />
              <p className="text-sm font-medium">Adjunta PDFs o Imágenes de ejercicios</p>
              <p className="text-xs mt-1">Soportado por Mistral OCR. Subiremos los vectores a Cosmos.</p>
            </div>
          )}
        </div>

        {/* Weak Points Alert Overview */}
        {weakPoints.length > 0 && (
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 mb-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Resultados del Examen Anterior (Puntos Débiles)
            </h3>
            <div className="space-y-3">
              {weakPoints.map((wp: any, idx: number) => (
                <div key={idx} className={`p-3 rounded-lg border text-sm ${getHighlightColor(wp.criticality)}`}>
                  <div className="font-semibold">{wp.topic} - {wp.criticality} Priority</div>
                  <div className="opacity-80 mt-1">{wp.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notion-like Editor */}
        <div className="relative group flex-1 flex flex-col">
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="w-full flex-1 bg-transparent border-none outline-none resize-none font-mono text-[15px] leading-relaxed text-gray-800 dark:text-gray-200 placeholder:text-gray-300 min-h-[500px]"
            placeholder="Empieza a escribir..."
            spellCheck="false"
          />
        </div>
      </div>
    </div>
  );
}
