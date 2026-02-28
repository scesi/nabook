"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, BrainCircuit, CheckCircle2, 
  XOctagon, Loader2, AlertTriangle, ShieldAlert
} from "lucide-react";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

interface ExamData {
  examTitle: string;
  questions: Question[];
}

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  
  // Modal de advertencia para bloqueo de navegación
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  useEffect(() => {
    // 1. Evitar recargas o cierres accidentales de pestaña
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isFinished) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // 2. Fetch del examen RAG
    const generateExam = async () => {
      try {
        const title = localStorage.getItem(`title_${id}`) || "Conceptos Generales";
        const content = localStorage.getItem(`markdown_${id}`) || "";
        
        const res = await fetch("/api/generate-exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: title, content })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Error al conectarse a la API de generación de exámenes.");
        }

        const data = await res.json();
        if (!data.exam) {
          throw new Error("La API no devolvió un formato de examen válido.");
        }
        setExam(data.exam);
      } catch (err: any) {
        console.error("Error al generar examen:", err);
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    generateExam();

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [id, isFinished]);

  // Bloqueo de navegación "Soft" dentro de Next.js
  const attemptExit = (route: string) => {
    if (!isFinished) {
      setPendingRoute(route);
      setShowExitWarning(true);
    } else {
      router.push(route);
    }
  };

  const confirmExit = () => {
    if (pendingRoute) {
      // Eliminar el progreso hipotético
      router.push(pendingRoute);
    }
  };

  const handleSelectOption = (optIndex: number) => {
    if (!exam) return;
    const currentQId = exam.questions[currentQuestionIdx].id;
    setSelectedAnswers(prev => ({ ...prev, [currentQId]: optIndex }));
  };

  const handleNext = () => {
    if (!exam) return;
    if (currentQuestionIdx < exam.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      finishExam();
    }
  };

  const finishExam = () => {
    if (!exam) return;
    setIsFinished(true);

    // Lógica para detectar puntos débiles basada en respuestas incorrectas
    const weakPoints: any[] = [];
    
    exam.questions.forEach((q) => {
      const isCorrect = selectedAnswers[q.id] === q.correctOptionIndex;
      if (!isCorrect) {
        weakPoints.push({
          topic: "Concepto: " + q.questionText.substring(0, 30) + "...",
          description: "Fallaste esta pregunta. " + q.explanation,
          criticality: "HIGH", // Podría determinarse por la IA en un escenario avanzado
          matchedTextSnippet: q.questionText,
        });
      }
    });

    // Guardar en localStorage para que el Editor los resalte
    localStorage.setItem(`weakPoints_${id}`, JSON.stringify(weakPoints));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center text-gray-900 dark:text-gray-100 font-sans p-6 text-center">
        <XOctagon className="w-12 h-12 mb-4 text-red-500" />
        <h2 className="text-xl font-medium tracking-tight mb-2">Error al generar examen</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">{error}</p>
        <button
          onClick={() => router.push(`/editor/${id}`)}
          className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Volver a apuntes
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center text-gray-900 dark:text-gray-100 font-sans">
        <BrainCircuit className="w-12 h-12 mb-4 text-blue-500 animate-pulse" />
        <h2 className="text-xl font-medium tracking-tight">Analizando tus apuntes...</h2>
        <p className="text-sm text-gray-500 mt-2">Azure AI Search & GPT-4o están diseñando tu examen dinámico.</p>
        <div className="mt-8 flex gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  const currentQ = exam.questions[currentQuestionIdx];
  const hasSelectedCurrent = selectedAnswers[currentQ.id] !== undefined;

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-black text-gray-900 dark:text-gray-100 font-sans flex flex-col">
      {/* Warning Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">¿Abandonar el examen?</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
              Si sales del examen en este momento, todo tu progreso se eliminará y tendrás que empezar de cero o generar uno nuevo al volver a tus apuntes.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowExitWarning(false)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Continuar examen
              </button>
              <button 
                onClick={confirmExit}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-30">
        <button 
          onClick={() => attemptExit(`/editor/${id}`)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a los apuntes
        </button>
        <div className="font-semibold tracking-tight text-lg">
          {exam.examTitle}
        </div>
        <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
          Evaluación en curso
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 sm:p-12 flex flex-col justify-center">
        
        {!isFinished ? (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-8 sm:p-10 rounded-2xl shadow-sm relative overflow-hidden">
            {/* Progress indicator */}
            <div className="absolute top-0 left-0 h-1 bg-gray-100 dark:bg-zinc-800 w-full">
              <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                style={{ width: `${((currentQuestionIdx + 1) / exam.questions.length) * 100}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between mb-8 mt-2">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
                Pregunta {currentQuestionIdx + 1} de {exam.questions.length}
              </h2>
            </div>

            <h3 className="text-2xl font-medium leading-tight mb-8">
              {currentQ.questionText}
            </h3>

            <div className="space-y-3">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedAnswers[currentQ.id] === idx;
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`
                      w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4
                      ${isSelected 
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                        : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-900'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                      ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400'}
                    `}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="flex-1">{opt}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-10 flex justify-end">
              <button
                onClick={handleNext}
                disabled={!hasSelectedCurrent}
                className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                {currentQuestionIdx === exam.questions.length - 1 ? "Finalizar Examen" : "Siguiente pregunta"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-8 sm:p-12 rounded-3xl shadow-lg text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Examen Completado</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              La IA ha evaluado tus respuestas. Hemos guardado una lista de tus puntos débiles. 
              Regresa a tus apuntes para ver los conceptos resaltados.
            </p>
            <button
              onClick={() => router.push(`/editor/${id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all"
            >
              Volver y ver Puntos Débiles
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
