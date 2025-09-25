/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectToDatabase from '../../../lib/mongodb';
import LitigationDoc from '../../../models/LitigationDoc';
import User from '../../../models/User';

const BASE_URL = 'https://rag-prod.studio.lyzr.ai';
const API_KEY = process.env.NEXT_PUBLIC_LYZR_API_KEY;

interface ErrorResponse {
    error: string;
    details?: any;
    step?: string;
    userId?: string;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const pdfFiles = formData.getAll('pdf');
        
        if (!pdfFiles || pdfFiles.length === 0) {
            return NextResponse.json({ 
                error: 'No PDF files provided',
                details: 'Please upload at least one PDF file to process'
            } as ErrorResponse, { status: 400 });
        }

        for (const file of pdfFiles) {
            if (!(file instanceof Blob)) {
                return NextResponse.json({
                    error: 'Invalid file format',
                    details: 'Please ensure all files are valid PDF documents'
                } as ErrorResponse, { status: 400 });
            }

            const fileType = (file as any).type;
            if (fileType !== 'application/pdf') {
                return NextResponse.json({
                    error: 'Invalid file type',
                    details: 'Only PDF files are supported'
                } as ErrorResponse, { status: 400 });
            }
        }
        
        const cookieStore = await cookies();
        const userId = cookieStore.get('user_id')?.value;

        try {
            await connectToDatabase();
        } catch (dbError) {
            return NextResponse.json({
                error: 'Service temporarily unavailable',
                details: 'Unable to connect to database. Please try again later.'
            } as ErrorResponse, { status: 500 });
        }
        
        let user;
        try {
            user = await User.findOne({ user_id: userId });
            
            if (!user) {
                user = new User({
                    user_id: userId,
                    api_key: API_KEY || `api_key_${Date.now()}`,
                    is_onboarded: true,
                    is_new_user: true
                });
                await user.save();
            }
        } catch (userError) {
            return NextResponse.json({
                error: 'User authentication failed',
                details: 'Unable to verify user credentials. Please try again.'
            } as ErrorResponse, { status: 500 });
        }
        
        const userApiKey = user.api_key || API_KEY;
        if (!userApiKey) {
            return NextResponse.json({
                error: 'Service configuration error',
                details: 'API key not available. Please contact support.'
            } as ErrorResponse, { status: 500 });
        }

        const uniqueCollectionName = `pdf_analysis_${userId}_${Date.now()}`;
        
        try {
            let fileName = "document";
            if (pdfFiles.length > 0) {
                const firstFile = pdfFiles[0] as unknown as File;
                if ('name' in firstFile) {
                    fileName = firstFile.name || 'document';
                }
            }

            console.log(`Creating RAG for user: ${userId}, collection: ${uniqueCollectionName}`);
            const ragResponse = await createRag(
                userId, 
                userApiKey,
                `PDF Analysis for ${fileName}`, 
                uniqueCollectionName
            );
            
            if (!ragResponse || !ragResponse.id) {
                throw new Error('Failed to initialize document processing');
            }

            const ragId = ragResponse.id;
            console.log(`RAG created with ID: ${ragId}`);

            console.log(`Training ${pdfFiles.length} PDF files with RAG ID: ${ragId}`);
            const trainingPromises = pdfFiles.map(async (pdfFile) => {
                const file = pdfFile as unknown as File;
                if (!(file instanceof Blob)) {
                    throw new Error(`Invalid file object: ${typeof file}`);
                }
                return trainPdf(ragId, file, userApiKey);
            });

            const trainingResults = await Promise.all(trainingPromises);
            const failedTrainings = trainingResults.filter(result => result.error);
            
            if (failedTrainings.length > 0) {
                console.error(`Training failed for ${failedTrainings.length} files`);
                throw new Error(`Document processing failed`);
            }
            
            console.log(`Successfully trained ${pdfFiles.length} PDF files`);

            const litigationDoc = new LitigationDoc({
                userId: userId,
                ragId: ragId,
                collectionName: uniqueCollectionName,
                originalFileName: fileName,
                litigationResponse: {
                    shortResponse: {},
                    longResponse: {}
                },
                ragResponse: {
                    id: ragResponse.id,
                    user_id: ragResponse.user_id || userId,
                    collection_name: ragResponse.collection_name,
                    description: ragResponse.description,
                    llm_model: ragResponse.llm_model || "gpt-4o-mini",
                    embedding_model: ragResponse.embedding_model || "text-embedding-ada-002",
                    vector_store_provider: ragResponse.vector_store_provider || "Qdrant [Lyzr]",
                    meta_data: ragResponse.meta_data || {},
                    trained: true
                }
            });
            
            const savedDoc = await litigationDoc.save();
            console.log(`Document saved with ID: ${savedDoc._id.toString()}`);
            
            const responseObj = {
                message: 'Documents processed successfully',
                documentId: savedDoc._id.toString(),
                ragId,
                userId,
                collectionName: uniqueCollectionName,
                filesProcessed: pdfFiles.length,
                apiCallDetails: {
                    ragCreation: {
                        endpoint: `${BASE_URL}/v3/rag/`,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': userApiKey
                        },
                        body: {
                            user_id: userId,
                            description: `PDF Analysis for ${fileName}`,
                            llm_credential_id: "lyzr_openai",
                            embedding_credential_id: "lyzr_openai",
                            vector_db_credential_id: "lyzr_qdrant",
                            vector_store_provider: "Qdrant [Lyzr]",
                            collection_name: uniqueCollectionName,
                            llm_model: "gpt-4o-mini",
                            embedding_model: "text-embedding-ada-002"
                        },
                        response: ragResponse
                    },
                    pdfTraining: pdfFiles.map((pdfFile, index) => {
                        const file = pdfFile as unknown as File;
                        return {
                            fileIndex: index,
                            fileName: 'name' in file ? file.name : 'unknown',
                            endpoint: `${BASE_URL}/v3/train/pdf/?rag_id=${ragId}`,
                            method: 'POST',
                            headers: {
                                'x-api-key': userApiKey
                            },
                            formData: {
                                file: `PDF file (${file.size} bytes)`,
                                data_parser: 'llmsherpa',
                                extra_info: '{}'
                            },
                            response: trainingResults[index]
                        };
                    })
                }
            };
            
            const response = NextResponse.json(responseObj);
            response.cookies.set('rag_id', ragId);
            response.cookies.set('active_user_id', userId);
            response.cookies.set('active_litigation_doc_id', savedDoc._id.toString());

            return response;

        } catch (processingError) {
            console.error('PDF Processing Error:', processingError.status);
            return NextResponse.json({
                error: 'Document processing failed',
                details: 'Unable to process the uploaded documents. Please check file format and try again.',
                userId
            } as ErrorResponse, { status: 500 });
        }
    } catch (error) {
        console.error('Request Error:', error.status);
        return NextResponse.json({
            error: 'Request failed',
            details: 'An unexpected error occurred. Please try again.'
        } as ErrorResponse, { status: 500 });
    }
}

async function createRag(
    userId: string,
    apiKey: string,
    description = "PDF analysis",
    collectionName: string
) {
    const response = await fetch(`${BASE_URL}/v3/rag/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
        body: JSON.stringify({
            user_id: userId,
            description: description,
            llm_credential_id: "lyzr_openai",
            embedding_credential_id: "lyzr_openai",
            vector_db_credential_id: "lyzr_qdrant",
            vector_store_provider: "Qdrant [Lyzr]",
            collection_name: collectionName,
            llm_model: "gpt-4o-mini",
            embedding_model: "text-embedding-ada-002"
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RAG creation failed: ${response.status}`);
    }

    return response.json();
}

async function trainPdf(ragId: string, pdfFile: Blob, apiKey: string) {
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('data_parser', 'llmsherpa');
    formData.append('extra_info', JSON.stringify({}));

    const response = await fetch(`${BASE_URL}/v3/train/pdf/?rag_id=${ragId}`, {
        method: 'POST',
        headers: {  
            'x-api-key': apiKey,
        },
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        return { error: `Training failed: ${response.status} ` };
    }

    const data = await response.json();
    return data || { success: true };
}