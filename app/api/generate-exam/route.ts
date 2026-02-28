import { NextResponse } from "next/server";
import { openaiClient, searchClient } from "@/lib/azure-config";

/**
 * Endpoint para generar examen vía RAG:
 * 1. Convierte el tema deseado a un vector.
 * 2. Consulta en AI Search los contextos más similares (documentos o markdown indexado).
 * 3. Usa GPT-4o para generar el examen en formato JSON con opciones.
 */
export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "El campo 'topic' es obligatorio." }, { status: 400 });
    }

    // =========================================================
    // 1. Vectorizar el topico consultado (Consulta)
    // =========================================================
    const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small";
    
    const embedResponse = await openaiClient.embeddings.create({
      model: embeddingDeployment,
      input: topic
    });
    const topicVector = embedResponse.data[0].embedding;

    // =========================================================
    // 2. Búsqueda Vectorial Híbrida/Pura en AI Search
    // =========================================================
    const searchResults = await searchClient.search(topic, {
      vectorSearchOptions: {
        queries: [
          {
            kind: "vector",
            vector: topicVector,
            fields: ["contentVector"], // Campo configurado en el vectorStore
            kNearestNeighborsCount: 3, // Recuperar los 3 chunks más relevantes
          }
        ]
      },
      select: ["content"],
    });

    // Mapear el contenido encontrado para darle contexto a GPT-4o
    const contextChunks: string[] = [];
    for await (const result of searchResults.results) {
      if ((result.document as any).content) {
        contextChunks.push((result.document as any).content as string);
      }
    }
    const ragContext = contextChunks.join("\n\n---\n\n");

    if (contextChunks.length === 0) {
       return NextResponse.json(
          { error: "No se encontró información suficiente en tu base de conocimientos para este tema." },
          { status: 404 }
       );
    }

    // =========================================================
    // 3. Generación del Examen con GPT-4o devolviendo JSON Puro
    // =========================================================
    const chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-4o";
    const systemPrompt = `
      Eres un examinador académico experto.
      Basándote EXCLUSIVAMENTE en el contexto proporcionado, genera un examen dinámico tipo test.
      Tu salida DEBE SER EXCLUSIVAMENTE en formato JSON válido, de acuerdo con esta estructura:
      {
        "examTitle": "Título del Examen",
        "questions": [
          {
            "id": "uuid o identificador",
            "questionText": "Pregunta...",
            "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
            "correctOptionIndex": 0,
            "explanation": "Breve explicación de por qué es la respuesta correcta."
          }
        ]
      }
      Genera 3 preguntas de dificultad media.
    `;

    const chatResponse = await openaiClient.chat.completions.create({
      model: chatDeployment,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Contexto obtenido de los apuntes:\n${ragContext}\n\nGenera un examen sobre: ${topic}.` },
      ],
      response_format: { type: "json_object" }
    });

    const generatedJsonData = chatResponse.choices[0].message.content;
    
    if (!generatedJsonData) {
      throw new Error("El modelo no retornó ningún contenido.");
    }

    // Retorna directamente el JSON parseado
    return NextResponse.json({
      success: true,
      exam: JSON.parse(generatedJsonData),
    });

  } catch (error: any) {
    console.error("[GenerateExam API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
