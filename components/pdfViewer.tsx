// /* eslint-disable @typescript-eslint/no-unused-vars */
// import React, { useState } from "react";
// import { Document, Page, pdfjs } from "react-pdf";
// import { Loader2, ChevronRight, ArrowBigLeft } from "lucide-react";

// pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

// interface SimplePdfViewerProps {"use client";
// import { Viewer, Worker } from "@react-pdf-viewer/core";
// import "@react-pdf-viewer/core/lib/styles/index.css";
// import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
// import "@react-pdf-viewer/default-layout/lib/styles/index.css";
// const PdfViewer = ({ url }) => {
//   const defaultLayoutPluginInstance = defaultLayoutPlugin();
//   return (
//     <div className="h-screen w-screen">
//       <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.10.111/build/pdf.worker.min.js">
//         <Viewer
//           fileUrl={url}
//           plugins={[defaultLayoutPluginInstance]}
//         />
//       </Worker>
//     </div>
//   );
// };
// export default PdfViewer;
//   file: string | Blob; 
//   onClose?: () => void;
// }

// const SimplePdfViewer: React.FC<SimplePdfViewerProps> = ({ file, onClose }) => {
//   const [numPages, setNumPages] = useState<number | null>(null);
//   const [pageNumber, setPageNumber] = useState<number>(1);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);

//   function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
//     setNumPages(numPages);
//     setLoading(false);
//   }

//   const nextPage = () => {
//     if (numPages && pageNumber < numPages) {
//       setPageNumber(pageNumber + 1);
//     }
//   };

//   const previousPage = () => {
//     if (pageNumber > 1) {
//       setPageNumber(pageNumber - 1);
//     }
//   };

//   return (
//     <div className="flex flex-col h-full bg-gray-100">
//       <div className="flex justify-between items-center px-4 py-2 bg-white border-b">
//         {onClose && (
//           <button
//             onClick={onClose}
//             className="flex items-center text-gray-600 hover:text-gray-900"
//           >
//             <ArrowBigLeft className="w-5 h-5 mr-1" />
//             Back
//           </button>
//         )}

//         <div className="flex items-center gap-4">
//           {numPages && (
//             <span className="text-sm">
//               Page {pageNumber} of {numPages}
//             </span>
//           )}
          
//           <div className="flex gap-2">
//             <button 
//               onClick={previousPage} 
//               disabled={pageNumber <= 1}
//               className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
//             >
//               Previous
//             </button>
//             <button 
//               onClick={nextPage} 
//               disabled={numPages !== null && pageNumber >= numPages}
//               className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
//             >
//               Next
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="flex-grow flex justify-center p-4 overflow-auto">
//         <Document
//           file={file}
//           onLoadSuccess={onDocumentLoadSuccess}
//           onLoadError={(err) => setError(err.message)}
//           loading={
//             <div className="flex items-center justify-center h-64">
//               <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
//             </div>
//           }
//         >
//           {error ? (
//             <div className="text-red-500 p-4">Error loading PDF: {error}</div>
//           ) : (
//             <Page
//               pageNumber={pageNumber}
//               renderTextLayer={false}
//               renderAnnotationLayer={false}
//               loading={
//                 <div className="flex justify-center p-4">
//                   <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
//                 </div>
//               }
//             />
//           )}
//         </Document>
//       </div>
//     </div>
//   );
// };

// export default SimplePdfViewer;


"use client";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
const PdfViewer = ({ url }) => {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  return (
    <div className="h-screen w-screen">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.js">
        <Viewer
          fileUrl={url}
          plugins={[defaultLayoutPluginInstance]}
        />
      </Worker>
    </div>
  );
};
export default PdfViewer;