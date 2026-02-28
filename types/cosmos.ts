/**
 * Esquema de datos para Azure Cosmos DB.
 * 
 * Se guarda el estado del usuario: su sesión, sus notas en Markdown,
 * y los puntos débiles identificados por GPT-4o tras una serie de exámenes para RAG.
 */

export interface MarkdownSession {
  id: string; // Identificador único (UUID) de esta sesión o documento
  userId: string; // Partition Key (optimiza particionamiento físico y consultas)
  title: string; // Título que el usuario le da a sus notas
  markdownContent: string; // El texto plano en formato Markdown escrito o extraído
  
  // Metadatos
  createdAt: string; // Formato ISO 8601
  updatedAt: string; // Formato ISO 8601
  
  // Analíticas de IA (generado tras cotejar apuntes con respuestas erradas)
  weakPoints: WeakPoint[];
}

export interface WeakPoint {
  id: string; // UUID
  topic: string; // Resumen del tema (Ej: 'Física Cuántica Básica')
  description: string; // Explicación de por qué la IA cree que el usuario debe repasarlo
  criticality: "LOW" | "MEDIUM" | "HIGH"; // Para mostrar colores/badges en el UI del editor Markdown
  matchedTextSnippet: string; // Fragmento del markdown original relacionado
}
