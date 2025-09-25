/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, ChevronRight, ExternalLink, Trash2, Plus, X, Eye } from 'lucide-react';
import EmptySvg from './ui/logosvg copy';
import LogoIcon from './ui/logosvg';
import { useRouter } from 'next/navigation';
import FilledSvg from './ui/filledsvg';
import Cookies from 'js-cookie';
import { ensureUserId } from '../utils/clientCookies';
import { ProfileHeader } from './ProfileHeader';

// Add keyframe animation for progress bar
const progressAnimation = `
@keyframes progress {
  0% { width: 0% }
  100% { width: 100% }
}

.animate-progress {
  animation: progress 2s ease-in-out infinite;
}
`;

// Add style tag to head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = progressAnimation;
  document.head.appendChild(style);
}

// Define the document interface
interface LitigationDocument {
  _id: string;
  userId: string;
  ragId: string;
  originalFileName: string;
  collectionName: string;
  created_at: string;
}

const HomePage: React.FC = () => {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [pdfUrls, setPdfUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [processingFileNames, setProcessingFileNames] = useState<string[]>([]);

  // New state for user documents and modal
  const [userDocuments, setUserDocuments] = useState<LitigationDocument[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmptyStateModal, setIsEmptyStateModal] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [currentRagId, setCurrentRagId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch user documents on component mount
  useEffect(() => {
    fetchUserDocuments();
  }, []);

  // Automatically open modal when no documents exist
  useEffect(() => {
    if (!isLoadingDocuments && userDocuments.length === 0) {
      setIsEmptyStateModal(true);
      setIsModalOpen(true);
    }
  }, [isLoadingDocuments, userDocuments]);

  // Handle clicks outside modal to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        // Only allow closing if not in empty state
        if (!isEmptyStateModal || userDocuments.length > 0) {
          setIsModalOpen(false);
        }
      }
    };

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen, isEmptyStateModal, userDocuments]);

  // Fetch user documents from the API
  const fetchUserDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const userId = Cookies.get('user_id') || ensureUserId();
      const response = await fetch(`/api/litigation-documents?userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      if (data.documents) {
        setUserDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching user documents:', error);
      setError('Failed to load your documents. Please try again.');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Delete a document
  const handleDeleteDocument = async (docId: string) => {
    try {
      setDeletingDocId(docId);
      const response = await fetch(`/api/litigation-documents/${docId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Remove from local state
      setUserDocuments(prev => prev.filter(doc => doc._id !== docId));

    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete the document. Please try again.');
    } finally {
      setDeletingDocId(null);
    }
  };

  // View a document
  const handleViewDocument = async (doc: LitigationDocument) => {
    try {
      // First clear any existing cookies
      Cookies.remove('active_litigation_doc_id');
      Cookies.remove('rag_id');

      // Fetch the latest document data
      const response = await fetch(`/api/litigation-documents/${doc._id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch document details');
      }

      const documentData = await response.json();
      const currentDoc = documentData.document;

      // Set expiration date to 1 year from now (matching the pattern in the image)
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);

      // Set cookies with expiration
      Cookies.set('active_litigation_doc_id', currentDoc._id);

      Cookies.set('rag_id', currentDoc.ragId);

      // Navigate to insights page
      router.push('/pdf-insights-chat');
    } catch (error) {
      console.error('Error viewing document:', error);
      setError('Failed to load document. Please try again.');
    }
  };

  // Open modal and reset file state
  const handleNewDocument = () => {
    // Clear cookies when creating a new document
    Cookies.remove('active_litigation_doc_id');
    Cookies.remove('rag_id');

    // Also clear from localStorage


    setFiles([]);
    setPdfUrls({});
    setProcessingComplete(false);
    setError(null);
    setIsEmptyStateModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Limit the number of files to 3
      const currentFileCount = files.length;
      const newFilesArray = Array.from(e.target.files);
      const remainingSlots = 3 - currentFileCount;

      if (newFilesArray.length > remainingSlots) {
        // If user is trying to upload more than the remaining slots
        setError(`You can only upload a maximum of 3 files. You have ${remainingSlots} slot(s) remaining.`);

        // Only take the first 'remainingSlots' files
        const selectedFiles = newFilesArray.slice(0, remainingSlots);

        if (selectedFiles.length === 0) {
          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
      } else {
        // User is uploading within limits
        setError(null);
        setFiles(prevFiles => [...prevFiles, ...newFilesArray]);
      }

      setProcessingComplete(false);

      // Create URLs for the valid files and store them
      const newUrls: { [key: string]: string } = {};
      const filesToProcess = newFilesArray.slice(0, remainingSlots);

      filesToProcess.forEach(file => {
        newUrls[file.name] = URL.createObjectURL(file);
      });

      setPdfUrls(prev => ({ ...prev, ...newUrls }));

      // Process the files
      await processMultiplePdfs(filesToProcess);

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    if (files.length >= 3) {
      setError('You have reached the maximum limit of 3 files.');
      return;
    }

    setError(null);
    setProcessingComplete(false);
    fileInputRef.current?.click();
  };

  const handleSampleClick = async () => {
    if (files.length >= 3) {
      setError('You have reached the maximum limit of 3 files.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setProcessingComplete(false);

      // Fetch the sample PDF file
      const response = await fetch('/23-55821.pdf');
      if (!response.ok) {
        throw new Error(`Failed to fetch sample PDF: ${response.statusText}`);
      }

      const blob = await response.blob();
      const sampleFile = new File([blob], 'sample.pdf', { type: 'application/pdf' });
      setFiles([sampleFile]);

      // Create URL for the blob
      const url = URL.createObjectURL(blob);
      setPdfUrls({ 'sample.pdf': url });
      setProcessingFileNames(['sample.pdf']);

      // Process the file
      await processMultiplePdfs([sampleFile]);
    } catch (err: any) {
      setError(err.message || 'Failed to load sample PDF');
    } finally {
      setLoading(false);
    }
  };

  const cleanupProcessing = async (ragId: string | null) => {
    if (ragId) {
      try {
        // First delete the RAG data
        const ragResponse = await fetch(`/api/cleanup-processing/${ragId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const ragData = await ragResponse.json();

        if (!ragResponse.ok) {
          throw new Error(ragData.error || 'Failed to cleanup RAG processing');
        }

        // Then find and delete the document record
        const userId = Cookies.get('user_id') || ensureUserId();
        const docResponse = await fetch(`/api/litigation-documents/by-rag/${ragId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        });

        const docData = await docResponse.json();

        if (!docResponse.ok) {
          throw new Error(docData.error || 'Failed to cleanup document record');
        }

        // Only proceed with UI cleanup if both deletions were successful
        // Clear local storage with error handling
        try {
          localStorage.removeItem('pdfFileNames');
          localStorage.removeItem('pdfUrls');
          localStorage.removeItem('pdfFiles');
        } catch (error) {
          console.error('Error clearing localStorage:', error);
          // Continue with other cleanup even if localStorage fails
        }

        // Clear cookies
        Cookies.remove('active_litigation_doc_id');
        Cookies.remove('rag_id');

        // Reset UI state
        setFiles([]);
        setPdfUrls({});
        setProcessingComplete(false);
        setError(null);
        setCurrentRagId(null);
        setIsProcessing(false);
        setProcessingFileNames([]);

        // Refresh the documents list
        await fetchUserDocuments();

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Cleanup URL objects
        Object.values(pdfUrls).forEach(url => {
          URL.revokeObjectURL(url);
        });

      } catch (error: any) {
        console.error('Error during cleanup:', error);
        setError(error.message || 'Failed to cleanup processing. Please try again.');
        throw error;
      }
    }
  };

  const handleModalClose = async () => {
    try {
      if (isProcessing && currentRagId) {
        await cleanupProcessing(currentRagId);
      }
      // Only allow closing if not in empty state
      if (!isEmptyStateModal || userDocuments.length > 0) {
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error closing modal:', error);
      // Keep modal open if cleanup failed
    }
  };

  const handleClearClick = async () => {
    try {
      if (!currentRagId) {
        console.log('No ragId available');
        return;
      }

      setLoading(true);
      // Fetch latest documents before trying to find the one to delete
      await fetchUserDocuments();

      // Find the document with current ragId
      const documentToDelete = userDocuments.find(doc => doc.ragId === currentRagId);
      console.log('Current ragId:', currentRagId);
      console.log('Document to delete:', documentToDelete);

      if (!documentToDelete) {
        console.log('No document found to delete');
        // If no document found, just clear the UI state
        setFiles([]);
        setPdfUrls({});
        setProcessingComplete(false);
        setCurrentRagId(null);
        setIsProcessing(false);
        setError(null);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Cleanup URL objects
        Object.values(pdfUrls).forEach(url => {
          URL.revokeObjectURL(url);
        });
        return;
      }

      await handleDeleteDocument(documentToDelete._id);
      // Reset UI state after successful deletion
      setFiles([]);
      setPdfUrls({});
      setProcessingComplete(false);
      setCurrentRagId(null);
      setIsProcessing(false);
      setError(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Cleanup URL objects
      Object.values(pdfUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error clearing document:', error);
      setError('Failed to clear document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processMultiplePdfs = async (pdfFiles: File[]) => {
    try {
      setLoading(true);
      setIsProcessing(true);
      setProcessingFileNames(pdfFiles.map(file => file.name));

      const formData = new FormData();
      pdfFiles.forEach(file => {
        console.log('File being appended:', {
          name: file.name,
          type: file.type,
          size: file.size
        });
        formData.append('pdf', file);
      });

      // Log FormData contents
      console.log('FormData entries:');
      for (const pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      console.log('Making API call to /api/process-pdf');
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      console.log('API Response status:', response.status);
      const result = await response.json();
      console.log('API Response data:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process PDFs');
      }

      if (result.ragId) {
        setCurrentRagId(result.ragId);
        await fetchUserDocuments();
      }

      setProcessingComplete(true);
    } catch (err: any) {
      console.error('Error in processMultiplePdfs:', err);
      setError(err.message || 'An unknown error occurred');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setLoading(false);
      setProcessingFileNames([]);
      setIsProcessing(false);
    }
  };

  const handlePreviewClick = (fileName: string) => {
    if (pdfUrls[fileName]) {
      window.open(pdfUrls[fileName], '_blank');
    }
  };

  const handleRemoveFile = (fileName: string) => {
    // Remove the file from the files array
    setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));

    // Clean up the URL object
    if (pdfUrls[fileName]) {
      URL.revokeObjectURL(pdfUrls[fileName]);
      setPdfUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[fileName];
        return newUrls;
      });
    }
  };

  const handleProceedClick = () => {
    if (files.length > 0) {
      try {
        // Check if localStorage is available
        const testKey = '__test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);

        // Store the file names and data with error handling
        try {
          localStorage.setItem('pdfFileNames', JSON.stringify(files.map(file => file.name)));
        } catch (error) {
          console.error('Error storing pdfFileNames:', error);
          setError('Failed to store file names. Please check browser storage settings.');
          return;
        }

        try {
          localStorage.setItem('pdfUrls', JSON.stringify(pdfUrls));
        } catch (error) {
          console.error('Error storing pdfUrls:', error);
          setError('Failed to store file URLs. Please check browser storage settings.');
          return;
        }

        // Convert files to base64 and store them
        const allFilesPromises = files.map(file => {
          return new Promise<{ name: string, data: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                name: file.name,
                data: reader.result as string
              });
            };
            reader.readAsDataURL(file);
          });
        });

        Promise.all(allFilesPromises).then(filesData => {
          try {
            localStorage.setItem('pdfFiles', JSON.stringify(filesData));
            setIsModalOpen(false);
            router.push('/pdf-insights-chat');
          } catch (error) {
            console.error('Error storing pdfFiles:', error);
            setError('Failed to store file data. The files might be too large for browser storage.');
          }
        });
      } catch (error) {
        console.error('localStorage not available:', error);
        setError('Browser storage is not available. Please enable storage or try a different browser.');
      }
    }
  };

  // Clean up URLs when component unmounts
  React.useEffect(() => {
    return () => {
      Object.values(pdfUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [pdfUrls]);

  // Format date for the document table
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="px-8 py-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <LogoIcon />
          <div className='border-r-2 border border-[#292929] h-12'></div>
          <div className='flex my-auto flex-col'>
            <span>
              <p className='text-3xl font-bold text-purple-500'>
                Litigation Analyzer
              </p>
            </span>
            <span>
              <p className='text-2xl font-bold text-[#292929] -mt-2'>
                Agent
              </p>
            </span>
          </div>
        </div>
        <ProfileHeader />
      </div>

      <div className="flex flex-col flex-grow px-8 pt-4">
        {userDocuments.length > 0 && (

          <div className="flex justify-between items-center">

            <h1 className="text-2xl font-bold">
              Analyze your <span className="text-purple-600">Litigation</span> Documents
            </h1>
            <button
              onClick={handleNewDocument}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-600"
            >
              <Plus size={18} />
              New Document
            </button>
          </div>
        )}
        {userDocuments.length > 0 && (
          <p className="text-gray-600 mb-6 -mt-1          ">
            Upload and process litigation files for detailed analysis and chat with the your documents
          </p>
        )}

        {/* Loading state for documents */}
        {isLoadingDocuments && (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <span className="ml-2 text-gray-600">Loading your documents...</span>
          </div>
        )}

        {/* Documents table */}
        {!isLoadingDocuments && userDocuments.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created on
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userDocuments.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {doc.originalFileName || doc.collectionName || 'Unnamed Document'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="text-gray-500 hover:text-gray-900 border border-gray-200 py-1 px-3 text-sm rounded"
                          title="View Document"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc._id)}
                          className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded"
                          title="Delete Document"
                          disabled={deletingDocId === doc._id}
                        >
                          {deletingDocId === doc._id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md w-full">
            {error}
          </div>
        )}

        {/* Upload Modal */}
        {isModalOpen && (
          <div className={`fixed inset-0 ${isEmptyStateModal ? 'bg-white mt-24' : 'bg-black bg-opacity-50'} flex items-center justify-center z-50 p-4 overflow-y-auto `}>
            <div
              ref={modalRef}
              className={` bg-white rounded-lg ${isEmptyStateModal ? 'bg-black bg-opacity-0  max-w-3xl overflow-y-auto mt-10  ' : ' shadow-xl max-w-2xl max-h-[90vh] overflow-y-auto'} w-full ] overflow-y-auto`}
            >
              <div className={`flex justify-between items-center 
              ${!isEmptyStateModal ? 'p-6 border-b' : 'p-0'}`}>
                <h3 className={`text-xl font-semibold text-gray-900
                ${isEmptyStateModal ? 'text-3xl mx-auto w-full     ' : ''}`}>
                  {isEmptyStateModal ? (
                    <div className="flex items-center  flex-col mx-auto">
                      <span className="text-gray-800 text-3xl font-semibold mx-auto">Analyze your <span className="text-purple-600">litigation </span> documents</span>
                      {/* <span className="ml-1"> Upload New Document</span> */}
                    </div>
                  ) : (
                    "Upload New Document"
                  )}
                </h3>
                {!isEmptyStateModal && (
                  <button
                    onClick={handleModalClose}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    disabled={isEmptyStateModal && userDocuments.length === 0}
                  >
                    <X size={24} />
                  </button>
                )}
              </div>

              <div className="p-6">
                <div className="flex flex-col items-center">
                  {files.length === 0 ? (
                    <div className="mb-6 w-full">
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer bg-gray-50 flex flex-col items-center justify-center"
                        onClick={handleUploadClick}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            const droppedFiles = Array.from(e.dataTransfer.files).filter(
                              file => file.type === 'application/pdf'
                            );

                            if (droppedFiles.length > 0) {
                              handleFileChange({
                                target: { files: droppedFiles }
                              } as any);
                            }
                          }
                        }}
                      >
                        <Upload className="w-12 h-12 text-gray-400 mb-3" />
                        <p className="text-lg font-medium text-gray-700">
                          Drag &amp; drop your PDFs here
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          or click to browse files
                        </p>
                        <p className="text-xs text-gray-400 mt-3">
                          Supports PDF files (max 3 files)
                        </p>
                      </div>
                      {isEmptyStateModal && (
                        <p className="text-gray-600  p-2 mx-auto w-full text-center                        ">
                          Upload and process litigation files for detailed analysis and chat with the your documents
                        </p>

                      )}
                    </div>
                  ) : (
                    <div className="mb-6 text-center">
                      <FilledSvg />
                      <p className="text-gray-600">
                        Your files are ready to be analyzed.
                      </p>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf"
                    multiple
                    className="hidden"
                  />

                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    {files.length === 0 && !processingComplete ? (
                      <>
                        <button
                          onClick={handleUploadClick}
                          className="bg-gray-50 border border-gray-300 w-full flex items-center justify-center gap-2 hover:text-gray-600 text-gray-500 font-semibold py-3 px-6 rounded"
                          disabled={loading || files.length >= 3}
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                          Upload PDFs (Max 3)
                        </button>

                        <button
                          onClick={handleSampleClick}
                          className="bg-purple-500 w-full disabled:bg-purple-300 disabled:hover:bg-purple-300 flex items-center justify-center gap-2 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded"
                          disabled={loading || files.length >= 3}
                        >
                          Use Sample PDF
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleClearClick}
                          className="bg-gray-50 border border-gray-300 w-full flex items-center justify-center gap-2 disabled:text-gray-400 hover:text-gray-600 text-gray-400 font-semibold py-3 px-6 rounded"
                          disabled={loading || !processingComplete}
                        >
                          Clear All
                        </button>
                        <button
                          onClick={handleProceedClick}
                          className="bg-purple-500 w-full flex items-center justify-center gap-2 hover:bg-purple-600 disabled:bg-purple-300 text-white font-bold py-3 px-6 rounded"
                          disabled={loading || !processingComplete}
                        >
                          Proceed
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* File count indicator */}
                  {files.length > 0 && (
                    <div className="mt-4 w-full">
                      <div className="text-sm text-gray-500 font-medium">
                        {files.length} of 3 PDF file{files.length > 1 ? 's' : ''} selected
                      </div>
                    </div>
                  )}

                  {/* Loading indicator for files being processed */}
                  {loading && processingFileNames.length > 0 && (
                    <div className="mt-6 w-full">
                      <div className="flex items-center p-4 bg-gray-50 border rounded-lg">
                        <FileText className="text-gray-500 mr-3" />
                        <div className="flex-grow truncate">
                          Processing {processingFileNames.length} file(s)...
                        </div>
                        <div className="flex items-center ml-3 text-purple-500">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Processing...
                        </div>
                      </div>
                    </div>
                  )}

                  {/* List of files */}
                  {files.length > 0 && (
                    <div className="mt-4 w-full max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-gray-200">
                      <div className="space-y-3">
                        {files.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className={`flex items-center p-4 bg-gray-50 border rounded-lg transition-all duration-300 ${index === 2 ? 'opacity-70' : ''}`}
                            style={{
                              transform: index === 2 ? 'scale(0.95)' : 'scale(1)',
                            }}
                          >
                            <FileText className="text-gray-500 mr-3 flex-shrink-0" />
                            <div className="flex-grow truncate">
                              {file.name}
                              {loading && (
                                <div className="mt-1 flex items-center">
                                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-purple-500 rounded-full animate-progress"
                                      style={{
                                        width: index === 2 ? '25%' : index === 1 ? '100%' : '100%'
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center ml-3 space-x-2">
                              <button
                                onClick={() => handlePreviewClick(file.name)}
                                className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center"
                              >
                                Preview
                                <ExternalLink className="w-4 h-4 ml-1" />
                              </button>
                              <button
                                onClick={() => handleRemoveFile(file.name)}
                                className="p-1 text-red-500 hover:text-red-700 rounded"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;