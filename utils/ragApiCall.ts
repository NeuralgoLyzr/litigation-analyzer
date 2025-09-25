import { cookies } from 'next/headers';

interface RagCreationResponse {
  id: string;
  user_id: string;
  llm_credential_id: string;
  embedding_credential_id: string;
  vector_db_credential_id: string;
  description: string;
  collection_name: string;
  llm_model: string;
  embedding_model: string;
  vector_store_provider: string;
  semantic_data_model: boolean;
  meta_data: Record<string, unknown>;
}

export async function createRag(
  userId: string,
  userApiKey: string,
  description = "litigation_analyser description",
  collectionName?: string
): Promise<RagCreationResponse> {
  const uniqueCollectionName = collectionName || `litigation_${userId}_${Date.now()}`;

  const response = await fetch('https://rag-prod.studio.lyzr.ai/v3/rag/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': userApiKey
    },
    body: JSON.stringify({
      user_id: userId,
      description: description,
      llm_credential_id: "lyzr_openai",
      embedding_credential_id: "lyzr_openai",
      vector_db_credential_id: "lyzr_qdrant",
      vector_store_provider: "Qdrant [Lyzr]",
      collection_name: uniqueCollectionName,
      llm_model: "gpt-4o-mini",
      embedding_model: "text-embedding-ada-002"
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create RAG: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Parse text for RAG training
export async function parseText(text: string, userApiKey?: string): Promise<string> {
  const apiKey = userApiKey || process.env.NEXT_PUBLIC_LYZR_API_KEY!;
  
  // Check if text is provided
  if (!text || text.trim().length === 0) {
    console.warn("Empty text provided to parseText function");
    return "";
  }
  
  try {
    const response = await fetch('https://rag-prod.studio.lyzr.ai/v3/parse/txt/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Parse text error: ${response.status} ${errorText}`);
      // Return original text instead of throwing error for resilience
      return text;
    }

    const result = await response.json();
    return result.parsed_text || text; // Return parsed text or original if parsing fails
  } catch (error) {
    console.error("Error in parseText:", error);
    // Return original text if any error occurs
    return text;
  }
}

// Train RAG with text
export async function trainRag(
  ragId: string, 
  texts: Array<{ text: string; source: string }>,
  userApiKey?: string
): Promise<void> {
  const apiKey = userApiKey || process.env.NEXT_PUBLIC_LYZR_API_KEY!;
  const url = `https://rag-prod.studio.lyzr.ai/v3/train/text/?rag_id=${ragId}`;

  const body = {
    "data": [
      {
        "text": texts.map(text => text.text).join("\n\n"),
        "source": "string",
        "extra_info": {}
      }
    ],
    "chunk_size": 1000,
    "chunk_overlap": 100
  }
  console.log(body)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },

      body: JSON.stringify(body)
    });

    if (!response.ok) {
      // const errorText = await response.text();
      throw new Error(`Failed to train RAG: ${response.status} `);
    }
  } catch (error) {
    console.error(`Error training RAG ${ragId}:`, error.status);
    throw error; // Re-throw to allow proper error handling upstream
  }
}

// Reading cookies is safe in server components
export async function getRagInfoFromCookies(): Promise<{ 
  ragId?: string; 
  userId?: string; 
  docId?: string;
}> {
  const cookieStore = await cookies();
  
  return {
    ragId: cookieStore.get('rag_id')?.value,
    userId: cookieStore.get('active_user_id')?.value,
    docId: cookieStore.get('active_litigation_doc_id')?.value,
  };
} 