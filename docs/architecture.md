# Arquitectura Propuesta para el Proyecto Hackathon (Next.js 14 + Azure)

Esta es la estructura de carpetas ideal recomendada para el proyecto dentro de un único repositorio de Next.js 14 utilizando App Router y principios de Clean Code.

```text
/
├── app/
│   ├── api/
│   │   ├── process-document/
│   │   │   └── route.ts         // API que abstrae Mistral OCR y vectorizado
│   │   └── generate-exam/
│   │       └── route.ts         // API principal de RAG para exámenes
│   ├── editor/
│   │   └── page.tsx             // Interfaz del editor Markdown (integrado con Cosmos)
│   ├── exam/
│   │   └── page.tsx             // Interfaz dinámica de exámenes generados
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── editor/
│   │   └── MarkdownEditor.tsx   // Componente reutilizable del editor MD
│   ├── exam/
│   │   └── QuizInterface.tsx    // Maneja el flujo de preguntas y respuestas
│   └── ui/                      // Componentes base (Botones, Inputs, etc.)
├── lib/
│   └── azure-config.ts          // Único punto de verdad para clientes de SDKs Azure
├── services/
│   ├── mistral.service.ts       // Abstracción Clean Code de Mistral OCR
│   ├── cosmos.service.ts        // Operaciones CRUD en Azure Cosmos DB
│   └── search.service.ts        // Consultas vectoriales hacia Azure AI Search
├── types/
│   └── cosmos.ts                // Tipado estricto (Esquema principal de Datos)
├── .env.example                 // Variables de configuración de Azure
└── package.json
```

## Patrones Utilizados:
1. **Clean Code & SOC (Separation of Concerns)**: Los clientes de servicio están instanciados en `lib/` y deberían ser envueltos en utilitarios en `services/` a medida que la aplicación crezca para aislar lógica de negocio.
2. **App Router API Routes**: Rutas altamente optimizadas, en los bordes para serverless.
3. **Manejo de Variables de Entorno Seguras**: Validaciones fall-fast para asegurar que la app no compile/ejecute sin credenciales.
