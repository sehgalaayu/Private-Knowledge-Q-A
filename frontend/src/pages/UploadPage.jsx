import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle, X } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { GlowButton } from '@/components/GlowButton';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const UploadPage = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/plain') {
      setFile(droppedFile);
      setUploadSuccess(false);
    } else {
      toast.error('Please upload a .txt file');
    }
  }, []);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(`Document uploaded! ${response.data.chunk_count} chunks created.`);
      setUploadSuccess(true);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setFile(null);
        setUploadSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadSuccess(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-heading font-bold text-foreground mb-2">
          Upload Documents
        </h1>
        <p className="text-muted-foreground">
          Add text files to your private knowledge base
        </p>
      </motion.div>

      {/* Upload Area */}
      <GlassCard>
        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          animate={{
            scale: isDragging ? 1.02 : 1,
            borderColor: isDragging ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)',
          }}
          className="border-2 border-dashed rounded-xl p-12 text-center transition-all"
          data-testid="upload-dropzone"
        >
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <UploadCloud className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Drag & Drop your file here
                </h3>
                <p className="text-muted-foreground mb-6">
                  or click to browse (.txt files only)
                </p>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                  data-testid="file-input"
                />
                <label htmlFor="file-input">
                  <GlowButton as="span" className="cursor-pointer" data-testid="browse-button">
                    Browse Files
                  </GlowButton>
                </label>
              </motion.div>
            ) : (
              <motion.div
                key="file-selected"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-primary/10">
                    {uploadSuccess ? (
                      <CheckCircle className="w-12 h-12 text-green-400" />
                    ) : (
                      <FileText className="w-12 h-12 text-primary" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground text-lg">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  {!uploadSuccess && (
                    <button
                      onClick={removeFile}
                      className="ml-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                      data-testid="remove-file-button"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                
                {!uploadSuccess && (
                  <GlowButton
                    onClick={handleUpload}
                    disabled={uploading}
                    data-testid="upload-button"
                  >
                    {uploading ? 'Processing...' : 'Upload & Process'}
                  </GlowButton>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Info */}
        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">How it works:</span> Your document will be split into chunks, 
            embedded using AI, and stored securely. You can then ask questions about the content.
          </p>
        </div>
      </GlassCard>
    </div>
  );
};