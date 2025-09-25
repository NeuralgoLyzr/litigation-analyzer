import axios from 'axios';
import crypto from 'crypto';

function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(5).toString('hex');
  return `${timestamp}-${randomStr}`;
}

interface LyzrRequestBody {
  user_id: string;
  agent_id: string;
  session_id: string;
  message: string;
  features?: Array<{
    type: string;
    config: {
      lyzr_rag: {
        base_url: string;
        rag_id: string;
        params: {
          top_k: number;
          retrieval_type: string;
          score_threshold: number;
        }
      }
    }
  }>;
}

export async function callLyzrAgent(message: string, lyzrApiKey: string, agentId: string, sessionId?: string, ragId?: string) {
  const userId = generateUniqueId();
  const chatSessionId = sessionId || generateUniqueId();
  console.log(userId, agentId, chatSessionId, message, ragId);
  
  const requestBody: LyzrRequestBody = {
    user_id: process.env.NEXT_PUBLIC_LYZR_USER_ID || "default@lyzr.ai",
    agent_id: agentId,
    session_id: chatSessionId,
    message: message
  };
  
  // Add features array with RAG configuration if ragId is provided
  if (ragId) {
    requestBody.features = [
      {
        type: "KNOWLEDGE_BASE",
        config: {
          lyzr_rag: {
            base_url: "https://rag-dev.test.studio.lyzr.ai",
            rag_id: ragId,
            params: {
              top_k: 7,
              retrieval_type: "mmr",
              score_threshold: 0
            }
          }
        }
      }
    ];
  }

  try {
    const response = await axios.post(
      'https://agent-prod.studio.lyzr.ai/v3/inference/chat/',
      requestBody,
      {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': lyzrApiKey
        }
      }
    );

    return {
      ...response.data,
      user_id: userId,
      session_id: chatSessionId
    };
  } catch (error) {
    console.error('Error calling Lyzr API:', error);
    throw new Error('An error occurred while processing your request');
  }
}