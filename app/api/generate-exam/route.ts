import { NextResponse } from "next/server";
// Importamos ensureSearchIndex desde tu archivo de configuración
import { openaiClient, searchClient, ensureSearchIndex } from "@/lib/azure-config";
import { ingestDocument } from "@/lib/ingest";

export async function POST(req: Request) {
  try {
    const { id, topic, content } = await req.json();
    console.log(`[GenerateExam] Iniciando. Topic: "${topic || 'Ninguno'}".`);

    if (!topic) {
      return NextResponse.json({ error: "El campo 'topic' es obligatorio." }, { status: 400 });
    }

    // =========================================================
    // 0. ASEGURAR QUE EL ÍNDICE EXISTE
    // =========================================================
    // Esto recreará el índice que borraste con la nueva config de searchable/retrievable
    await ensureSearchIndex();

    if (id && content) {
      console.log(`[GenerateExam] Ingestando documento id: ${id}`);
      await ingestDocument(id, content);
      
      // Pequeña pausa para asegurar la indexación en Azure Search antes de la búsqueda (por si hay eventual consistencia)
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // =========================================================
    // 1. Vectorizar el tópico
    // =========================================================
    const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small";
    console.log(`[GenerateExam] Generando vector para topic: "${topic}"...`);

    const embedResponse = await openaiClient.embeddings.create({
      model: embeddingDeployment, 
      input: topic,
    });

    const topicVector = embedResponse.data[0].embedding;

    // =========================================================
    // 2. Búsqueda Vectorial
    // =========================================================
    console.log(`[GenerateExam] Buscando en index de AI Search...`);
    
    // Usamos "*" para evitar errores de búsqueda de texto si el índice está vacío o es nuevo
    const searchResults = await searchClient.search("*", { 
      vectorSearchOptions: {
        queries: [
          {
            kind: "vector",
            vector: topicVector,
            fields: ["contentVector"],
            kNearestNeighborsCount: 3,
          },
        ],
      },
      select: ["content"],
    });

    const contextChunks: string[] = [];
    let chunksFound = 0;
    
    for await (const result of searchResults.results) {
      const doc = result.document as any;
      if (doc.content) {
        contextChunks.push(doc.content);
        chunksFound++;
      }
    }

    console.log(`[GenerateExam] ✓ Búsqueda completada. Chunks: ${chunksFound}.`);

    // =========================================================
    // MANEJO DE ÍNDICE VACÍO
    // =========================================================
    if (contextChunks.length === 0) {
       console.log("[GenerateExam] No hay datos. El índice existe pero está vacío.");
       return NextResponse.json(
          { error: "El índice se ha recreado pero no tiene documentos. Por favor, guarda/indexa algunos apuntes primero." },
          { status: 404 }
       );
    }

    // =========================================================
    // 3. Generación con GPT-4o
    // =========================================================
    const ragContext = contextChunks.join("\n\n---\n\n");
    const chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-4o";
    
    const systemPrompt = `
      Eres un examinador académico experto.
      Basándote EXCLUSIVAMENTE en el contexto proporcionado, genera un examen dinámico tipo test en JSON.
      Contexto:
      ${ragContext}
    `;

    const chatResponse = await openaiClient.chat.completions.create({
      model: chatDeployment,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Genera un examen sobre: ${topic}.` },
      ],
      response_format: { type: "json_object" }
    });

    return NextResponse.json({
      success: true,
      exam: JSON.parse(chatResponse.choices[0].message.content || "{}"),
    });

  } catch (error: any) {
    console.error("[GenerateExam API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}