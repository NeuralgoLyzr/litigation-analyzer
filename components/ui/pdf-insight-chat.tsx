/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, ChevronLeftCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import LogoIcon from './mainlogosvg';
import { ensureUserId } from '../../utils/clientCookies';
import TrainRagButton from './train-rag-button';
import ProcessStatusTracker from './process-status-tracker';
import Cookies from 'js-cookie';
import { MultiStepLoader } from './loader';

// Helper function to convert base64 to Blob
function base64ToBlob(base64Input: any) {
    try {
        console.log('Processing base64 data type:', typeof base64Input);

        // Handle the case when base64Input is an object with 'data' property
        let base64String: string;

        if (typeof base64Input === 'object' && base64Input !== null && base64Input.data) {
            base64String = base64Input.data;
            console.log('Using data property from object');
        } else if (typeof base64Input === 'string') {
            base64String = base64Input;
            console.log('Using string input directly');
        } else {
            console.error('Invalid input format for base64ToBlob:', base64Input);
            throw new Error('Invalid base64 input format');
        }

        // Check if the string includes the data URL prefix
        if (!base64String.includes(';base64,')) {
            // For direct base64 content without data URL
            console.log('Input is raw base64 content');
            try {
                return new Blob([Uint8Array.from(atob(base64String), c => c.charCodeAt(0))], { type: 'application/pdf' });
            } catch (error) {
                console.error('Error converting direct base64:', error);
                throw new Error('Invalid base64 content format');
            }
        }

        // Handle data URL format (data:application/pdf;base64,...)
        console.log('Processing data URL format');
        try {
            const parts = base64String.split(';base64,');
            const contentType = parts[0].split(':')[1] || 'application/pdf';
            const raw = window.atob(parts[1]);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);

            for (let i = 0; i < rawLength; ++i) {
                uInt8Array[i] = raw.charCodeAt(i);
            }

            return new Blob([uInt8Array], { type: contentType });
        } catch (error) {
            console.error('Error processing data URL:', error);
            throw new Error(`Error processing data URL: ${error.message}`);
        }
    } catch (error) {
        console.error('base64ToBlob failed:', error);
        throw error;
    }
}

// Message interface without RAG
interface Message {
    content: string;
    role: 'user' | 'agent';
    timestamp: Date;
}

// Update the interface to match the actual response structure
interface AnalysisResult {
    shortResponse: {
        response: string;
        module_outputs: Record<string, unknown>;
        user_id: string;
        session_id: string;
    };
    longResponse: {
        response: string;
        module_outputs: Record<string, unknown>;
        user_id: string;
        session_id: string;
    };
    processedFiles: Array<{
        fileName: string;
        pageCount: number;
        textLength: number;
    }>;
    totalFiles: number;
    totalTextLength: number;
}

// Interface for PDF file info
interface PdfFileInfo {
    name: string;
    data: string; // base64 data
    url?: string;
}

// Interface for job status
interface JobStatus {
    id: string;
    status: 'processing' | 'completed' | 'failed';
    project_name: string;
    created_at: string;
    updated_at: string;
    results?: AnalysisResult[];
    error?: string;
    error_code?: number;
}

// New interface for LitigationDoc response
interface LitigationDocResult {
    document: {
        userId: string;
        ragId: string;
        collectionName: string;
        originalFileName: string;
        litigationResponse: {
            shortResponse: {
                response: string;
                module_outputs: Record<string, unknown>;
                user_id: string;
                session_id: string;
            };
            longResponse: {
                response: string;
                module_outputs: Record<string, unknown>;
                user_id: string;
                session_id: string;
            };
        };
        ragResponse: {
            id: string;
            user_id: string;
            collection_name: string;
            description: string;
            llm_model: string;
            embedding_model: string;
            vector_store_provider: string;
            meta_data: Record<string, unknown>;
            trained: boolean;
        };
        created_at: string;
        updated_at: string;
        _id: string;
    }
}

const PDFInsightsChatPage = () => {
    const router = useRouter();

    // Chat state
    const [messages, setMessages] = useState<Message[]>([
        {
            content: "Hello! I'm preparing to analyze your document(s). I'll let you know when it's ready.",
            role: 'agent',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>(`session_${Date.now()}`);

    // PDF analysis state
    const [pdfError, setPdfError] = useState('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [processedPdfFiles, setProcessedPdfFiles] = useState<string[]>([]);

    // User state
    const [userId, setUserId] = useState<string | null>(null);
    const [litigationDocResult, setLitigationDocResult] = useState<LitigationDocResult | null>(null);

    // Process tracking state
    const [processStatusId, setProcessStatusId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const maxPollingAttempts = 60; // 2 minutes at 2-second intervals
    const [pollingAttempts, setPollingAttempts] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const hasAnalyzedPdf = useRef<boolean>(false);
    const isDocumentProcessing = useRef<boolean>(false);

    // Add notification state
    const [notification, setNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    // Add state for ragId
    const [ragId, setRagId] = useState<string | null>(null);

    // Define loading steps for MultiStepLoader
    const loadingSteps = [
        { text: "Initializing document analysis...", duration: 2000 },
        { text: "Processing document content...", duration: 15000 },
        { text: "Analyzing document structure...", duration: 15000 },
        { text: "Generating insights...", duration: 15000 },
        { text: "Finalizing analysis...", duration: 13000 }
    ];

    // Add state for loader visibility
    const [showLoader, setShowLoader] = useState(true);

    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Navigate back to home and clear cookies
    const navigateToHome = () => {
        Cookies.remove('rag_id');
        Cookies.remove('active_litigation_doc_id');

        // Clear localStorage items
        localStorage.removeItem('pdfFileNames');
        localStorage.removeItem('pdfFiles');
        localStorage.removeItem('pdfUrls');
        // Navigate to home page
        router.push('/');


    };



    // Process uploaded files from localStorage and initiate analysis
    const processStoredFiles = async (userId: string) => {
        try {
            const storedPdfFiles = localStorage.getItem('pdfFiles');
            const storedPdfNames = localStorage.getItem('pdfFileNames');

            if (!storedPdfFiles || !storedPdfNames) {
                throw new Error('No stored PDF files found');
            }

            const pdfFiles = JSON.parse(storedPdfFiles);
            const pdfFileNames = JSON.parse(storedPdfNames);

            if (!Array.isArray(pdfFiles) || !Array.isArray(pdfFileNames)) {
                throw new Error('Invalid format of stored PDF files');
            }

            console.log('Found stored files, starting document processing');

            // Start analysis process with stored files
            setIsLoading(true);

            // Set processed files for UI
            setProcessedPdfFiles(pdfFileNames);

            // Create form data for upload
            const formData = new FormData();

            // Convert stored files to blobs and add to form data
            for (let i = 0; i < pdfFileNames.length; i++) {
                let fileData;
                if (typeof pdfFiles[i] === 'object' && pdfFiles[i].data) {
                    fileData = pdfFiles[i].data;
                } else if (typeof pdfFiles[i] === 'string') {
                    fileData = pdfFiles[i];
                } else {
                    throw new Error(`Invalid data format for file ${pdfFileNames[i]}`);
                }

                const blob = base64ToBlob(fileData);
                const file = new File([blob], pdfFileNames[i], { type: 'application/pdf' });
                formData.append('pdf', file);
            }

            // Add user and session IDs
            formData.append('userId', userId);
            formData.append('sessionId', sessionId);

            // Make API call to initiate processing
            const response = await fetch('/api/litigation-document', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to initiate document processing: ${response.status} - ${errorText}`);
            }

            const responseData = await response.json();
            console.log('Document processing initiated:', responseData);

            if (responseData.statusId) {
                setProcessStatusId(responseData.statusId);
                isDocumentProcessing.current = true;
                setIsProcessing(true);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error processing stored files:', error);
            setPdfError(`Error processing stored files: ${error.message}`);
            return false;
        }
    };

    // Process document using ragId
    const processWithRagId = async (docRagId: string, userId: string) => {
        try {
            if (!docRagId) {
                throw new Error('No ragId provided');
            }

            const response = await fetch('/api/litigation-document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ragId: docRagId,
                    userId: userId
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to initiate document processing: ${response.status}`);
            }

            const data = await response.json();
            console.log('Document processing initiated with ragId:', data);

            if (data.statusId) {
                setProcessStatusId(data.statusId);
                isDocumentProcessing.current = true;
                setIsProcessing(true);
                // Start showing loader
                setShowLoader(true);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error initiating document processing with ragId:', error);
            setPdfError('Error initiating document analysis. Please try again.');
            // Hide loader on error
            setShowLoader(false);
            return false;
        }
    };

    // Separate function to handle document data
    const handleDocumentData = (doc: any) => {
        if (!doc) return;

        setLitigationDocResult({ document: doc });
        setAnalysisResult({
            shortResponse: doc.litigationResponse.shortResponse,
            longResponse: doc.litigationResponse.longResponse,
            processedFiles: [{
                fileName: doc.originalFileName,
                pageCount: 1,
                textLength: 0
            }],
            totalFiles: 1,
            totalTextLength: 0
        });

        setIsLoading(false);
        setIsInitialLoading(false);
        setShowLoader(false);
        hasAnalyzedPdf.current = true;

        setMessages([{
            content: "Hello! I've analyzed your document(s). Feel free to ask me any questions about it.",
            role: 'agent',
            timestamp: new Date()
        }]);
    };

    // Function to check document in DB
    const checkExistingDocument = async (docId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/litigation-documents/${docId}`);

            if (response.ok) {
                const result = await response.json();
                if (result.document?.litigationResponse?.shortResponse?.response &&
                    result.document?.litigationResponse?.longResponse?.response) {
                    // We have valid data, use it
                    handleDocumentData(result.document);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error fetching document:', error);
            return false;
        }
    };

    // Main initialization effect
    useEffect(() => {
        let isMounted = true;

        const initializePage = async () => {
            try {
                const docId = Cookies.get('active_litigation_doc_id');
                const ragId = Cookies.get('rag_id');
                const userId = Cookies.get('user_id') || ensureUserId();

                if (!userId) {
                    throw new Error('User ID not found');
                }

                setUserId(userId);

                // First try to get document from DB
                if (docId) {
                    const documentExists = await checkExistingDocument(docId);
                    if (documentExists) {
                        return; // Stop here if we found valid document
                    }
                }

                // If we get here, we need to process the document
                // Hide initial loader and show processing loader
                if (isMounted) {
                    setIsInitialLoading(false);
                    setShowLoader(true);

                    // Try stored files first
                    const storedPdfFiles = localStorage.getItem('pdfFiles');
                    const storedPdfNames = localStorage.getItem('pdfFileNames');

                    if (storedPdfFiles && storedPdfNames) {
                        await processStoredFiles(userId);
                        return;
                    }

                    // If no stored files but we have ragId, try that
                    if (ragId) {
                        await processWithRagId(ragId, userId);
                        return;
                    }

                    // If we get here, we have no way to process the document
                    setPdfError('No document information found. Please upload a document from the home page.');
                    setIsLoading(false);
                    setShowLoader(false);
                    setIsInitialLoading(false);
                }

            } catch (error) {
                console.error('Error initializing page:', error);
                if (isMounted) {
                    setPdfError(`Error: ${error.message}. Please return to home.`);
                    setIsLoading(false);
                    setShowLoader(false);
                    setIsInitialLoading(false);
                }
            }
        };

        initializePage();

        return () => {
            isMounted = false;
        };
    }, []);

    // When a new document is created, save all necessary cookies
    // useEffect(() => {
    //     if (litigationDocResult?.document) {
    //         const { ragId, _id, userId } = litigationDocResult.document;
    //         if (ragId && _id) {
    //             Cookies.set('rag_id', ragId);
    //             Cookies.set('active_litigation_doc_id', _id);
    //         }
    //         if (userId) {
    //             Cookies.set('user_id', userId);
    //         }
    //     }
    // }, [litigationDocResult]);

    const formatTimestamp = (timestamp: Date) => {
        const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return `${date}, ${time}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isChatLoading) return;

        const userMessage = input;

        setMessages(prev => [...prev, {
            content: userMessage,
            role: 'user',
            timestamp: new Date()
        }]);

        setInput('');
        setIsChatLoading(true);

        try {
            const chatResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage, sessionId })
            });

            if (!chatResponse.ok) {
                throw new Error('Failed to get response from chat API');
            }

            const chatData = await chatResponse.json();

            // Extract the response string from the potentially nested structure
            let responseContent = '';
            if (typeof chatData === 'object' && chatData !== null) {
                if (typeof chatData.response === 'string') {
                    responseContent = chatData.response;
                } else if (chatData.response && typeof chatData.response.response === 'string') {
                    // Handle doubly nested response structure
                    responseContent = chatData.response.response;
                } else {
                    // Fallback to stringify if we can't find a proper string
                    responseContent = JSON.stringify(chatData);
                }
            } else {
                responseContent = String(chatData);
            }

            // Update session ID if provided
            if (chatData.session_id) {
                setSessionId(chatData.session_id);
            }

            setMessages(prev => [...prev, {
                content: responseContent,
                role: 'agent',
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                content: 'Sorry, there was an error processing your message.',
                role: 'agent',
                timestamp: new Date()
            }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    // Custom components for React Markdown to control styling
    const markdownComponents = {
        p: ({ node, ...props }: any) => <p className="my-1" {...props} />,
        h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold my-3" {...props} />,
        h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold my-2" {...props} />,
        h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold my-2" {...props} />,
        ul: ({ node, ...props }: any) => <ul className="ml-6 list-disc my-2" {...props} />,
        ol: ({ node, ...props }: any) => <ol className="ml-6 list-decimal my-2" {...props} />,
        li: ({ node, ...props }: any) => <li className="my-1" {...props} />,
        strong: ({ node, ...props }: any) => <strong className="font-bold" {...props} />,
        em: ({ node, ...props }: any) => <em className="italic" {...props} />,
    };

    // Render the process status tracker when processing
    const renderProcessTracker = () => {
        if (!isProcessing) return null;

        if (processStatusId) {
            return (
                <ProcessStatusTracker
                    statusId={processStatusId}
                    pollingInterval={2000}
                    maxAttempts={120}
                    onComplete={(documentId, ragId) => {
                        // Hide loader when process is complete
                        setShowLoader(false);

                        // Fetch the document when process is complete
                        fetch(`/api/litigation-documents/${documentId}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('Failed to fetch document');
                                }
                                return response.json();
                            })
                            .then(data => {
                                setLitigationDocResult(data);

                                const doc = data.document;
                                setAnalysisResult({
                                    shortResponse: doc.litigationResponse.shortResponse,
                                    longResponse: doc.litigationResponse.longResponse,
                                    processedFiles: [{
                                        fileName: doc.originalFileName,
                                        pageCount: 1,
                                        textLength: 0
                                    }],
                                    totalFiles: 1,
                                    totalTextLength: 0
                                });

                                setIsProcessing(false);
                                setIsLoading(false);
                                hasAnalyzedPdf.current = true;

                                setMessages([{
                                    content: "Hello! I've analyzed your document(s). Feel free to ask me any questions about it.",
                                    role: 'agent',
                                    timestamp: new Date()
                                }]);
                            })
                            .catch(error => {
                                console.error('Error fetching document:', error);
                                setPdfError('Error fetching analyzed document. Please try again.');
                                setIsProcessing(false);
                                setIsLoading(false);
                                // Hide loader on error
                                setShowLoader(false);
                            });
                    }}
                    onError={(error) => {
                        console.error('Process error:', error);
                        setPdfError('Error analyzing document: ' + error);
                        setIsProcessing(false);
                        setIsLoading(false);
                        // Hide loader on error
                        setShowLoader(false);
                    }}
                />
            );
        }
        return null;
    };

    // Update cookies with proper expiration
    // const updateCookies = (ragId: string, docId: string) => {
    //     try {
    //         // Set expiration date to 1 year from now (matching the pattern in the image)
    //         const expirationDate = new Date();
    //         expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    //         // Set cookies with expiration
    //         Cookies.set('active_litigation_doc_id', docId);

    //         Cookies.set('rag_id', ragId);

    //         // Verify cookies were set
    //         const verifiedDocId = Cookies.get('active_litigation_doc_id');
    //         const verifiedRagId = Cookies.get('rag_id');

    //         if (!verifiedDocId || !verifiedRagId) {
    //             console.error('Cookie verification failed');
    //             showNotification('error', 'Warning: Had trouble saving document data.');
    //         }
    //     } catch (error) {
    //         console.error('Error setting cookies:', error);
    //         showNotification('error', 'Warning: Had trouble saving document data.');
    //     }
    // };

    // Helper function to show notifications
    // const showNotification = (type: 'success' | 'error', message: string) => {
    //     setNotification({ type, message });
    //     setTimeout(() => setNotification(null), 5000);
    // };

    return (
        <div className="flex h-[88vh] bg-white relative overflow-auto preview
        ">
            {/* Initial Loading State */}
            {isInitialLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        <p className="text-gray-600">Loading document data...</p>
                    </div>
                </div>
            )}

            {/* MultiStepLoader - Only show when processing */}
            {!isInitialLoading && showLoader && (
                <MultiStepLoader
                    loadingStates={loadingSteps}
                    loading={showLoader}
                    loop={true}
                />
            )}

            {/* Process Status Tracker - Hidden but functional */}
            <div className="hidden">
                {renderProcessTracker()}
            </div>

            {/* Logo Section - Always visible */}


            {/* Main Content - Only visible when not loading */}
            {!isInitialLoading && !showLoader && (
                <>
                    {/* PDF Insights Panel (40%) */}
                    <div className="w-3/5 p-4 overflow-y-auto">
                        {/* Error message */}
                        {pdfError && (
                            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                                <div className="font-medium">
                                    {pdfError}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                        onClick={navigateToHome}
                                        className="px-3 py-1.5 bg-red-200 hover:bg-red-300 rounded-md text-sm font-medium"
                                    >
                                        Go to Home
                                    </button>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
                                    >
                                        Reload Page
                                    </button>
                                </div>
                            </div>
                        )}

                        {analysisResult && (
                            <div className="">
                                <div className=" flex flex-row mb-4">
                                    <button
                                        onClick={navigateToHome}
                                        className="text-[#424242] px-4 py-2 rounded-lg hover:bg-gray-100 hover:text-gray-500"
                                    >
                                        <span className="text-base font-semibold flex flex-row my-auto gap-2">
                                            <ChevronLeftCircle /> Back to Home
                                        </span>
                                    </button>
                                </div>
                                <div className="flex justify-between items-center">
                                    <h1 className="text-2xl font-bold mb-2">Document Insights</h1>

                                </div>

                                {notification && (
                                    <div className={`mb-4 p-3 rounded-md ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {notification.message}
                                    </div>
                                )}

                                {/* New Slider with Two Buttons */}
                                <div className="bg-transparent rounded-lg shadow-sm p-4">
                                    <div className="relative">
                                        {/* Background Track */}
                                        <div className="h-10 bg-gray-200 rounded-lg relative ">
                                            {/* Slider Active Background */}
                                            <div
                                                className={`absolute top-0 h-[82%] flex my-auto mt-1 mx-1 rounded-lg bg-gray-50  transition-all duration-300 ${expanded ? 'right-0 left-1/2' : 'left-0 right-1/2'
                                                    }`}
                                            ></div>

                                            {/* Button Container - Using flex for even spacing */}
                                            <div className="absolute inset-0 flex ">
                                                {/* Left Button - Short Summary */}
                                                <button
                                                    onClick={() => setExpanded(false)}
                                                    className={`flex-1 h-full focus:outline-none rounded-lg font-medium text-sm z-10 transition-colors duration-300 ${!expanded ? 'text-gray-600' : 'text-gray-400 hover:text-gray-700'
                                                        }`}
                                                >
                                                    Brief Overview
                                                </button>

                                                {/* Right Button - Long Summary */}
                                                <button
                                                    onClick={() => setExpanded(true)}
                                                    className={`flex-1 h-full rounded-lg focus:outline-none font-medium text-sm z-10 transition-colors duration-300 ${expanded ? 'text-gray-600' : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    Detailed Overview
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm p-4 h-[60vh] overflow-auto preview">
                                    <div className="mb-4">
                                        <div className="text-gray-600 text-base flex flex-col">
                                            {/* Use React Markdown for formatting */}
                                            {expanded
                                                ? <p className='text-2xl text-[#292929] font-bold'> Detailed Overview</p>
                                                : <p className='text-2xl text-[#292929] font-bold'> Brief Overview</p>
                                            }
                                            <ReactMarkdown components={markdownComponents}>
                                                {expanded
                                                    ? analysisResult.longResponse.response
                                                    : analysisResult.shortResponse.response}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>



                    {/* Chat Interface (60%) */}
                    <div className="w-2/5 flex flex-col h-[85vh] shadow-lg rounded-xl p-4 bg-gray-50 border border-gray-100 m-1 overflow-auto preview
                    ">
                        {/* Header */}
                        <div className='flex flex-row my-auto justify-between'>
                            <span className='flex flex-col mb-4'>
                                <p className='text-2xl font-bold my-auto'>DocuChat  </p>
                                <p className='text-base text-gray-500 -mt-3'>Chat with the Agent</p>

                            </span>
                            <div className=" px-6 py-4  my-auto items-center">
                                <div className="">
                                    <button
                                        onClick={() => {
                                            setMessages([
                                                {
                                                    content: "Hello! I've analyzed your document(s). Feel free to ask me any questions about it.",
                                                    role: 'agent',
                                                    timestamp: new Date()
                                                }
                                            ]);
                                            setSessionId(`session_${Date.now()}`);
                                        }}
                                        className="text-[#424242] border border-[#cacaca] hover:text-gray-800 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100"
                                    >
                                        <Trash2 size={16} />
                                        <span className="text-sm font-semibold">Clear chat</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Chat Container */}
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto preview p-6 space-y-6">
                            {messages.map((message, messageIndex) => (
                                <div key={messageIndex} className="space-y-3">
                                    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex ${message.role === 'user' ? 'flex-col items-end' : 'flex-col items-start'} max-w-[80%]`}>
                                            <div className="flex flex-row gap-3">
                                                {message.role === 'agent' && (
                                                    <div className="mt-5">
                                                        <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                                            <LogoIcon />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className={`rounded-3xl mt-2 p-4 ${message.role === 'user'
                                                        ? 'bg-[#F1F1F1] text-[#292929]'
                                                        : 'bg-white border border-[#cacaca] text-[#292929]'
                                                        }`}>
                                                        {/* Use React Markdown for message content */}
                                                        <div className="whitespace-normal text-sm leading-relaxed">
                                                            <ReactMarkdown components={markdownComponents}>
                                                                {message.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                    <div className={`mt-1 ${message.role === 'user' ? 'ml-auto mr-1 justify-end flex' : 'ml-1'}`}>
                                                        <p className="text-xs text-gray-500">
                                                            {formatTimestamp(message.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="flex gap-4 justify-start">
                                    <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                        <LogoIcon />
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                                        <div className="flex space-x-2">
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="bg-white p-2 mb-10                         border-t border-gray-200">
                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Type your message..."
                                        className="w-full p-3 pr-12  border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        disabled={isChatLoading || isLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isChatLoading || !input.trim() || isLoading}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-purple-600 disabled:text-gray-300 transition-colors"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PDFInsightsChatPage;