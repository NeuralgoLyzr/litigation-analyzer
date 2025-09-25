// // First, create a utility file to handle PDF.js setup
// // /utils/pdfjs-setup.ts

// import { useEffect, useState } from 'react';

// // Initialize pdfjs in a way that works with Next.js
// export function usePdfJs() {
//   const [isLoaded, setIsLoaded] = useState(false);

//   useEffect(() => {
//     // Only run in browser environment
//     if (typeof window === 'undefined') return;

//     async function setupPdfJs() {
//       try {
//         const pdfjs = await import('pdfjs-dist');
//         // Set worker source to the file in public directory
//         pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
//         setIsLoaded(true);
//       } catch (error) {
//         console.error('Error loading PDF.js:', error);
//       }
//     }

//     setupPdfJs();
//   }, []);

//   return isLoaded;
// }