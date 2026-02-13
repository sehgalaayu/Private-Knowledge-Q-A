import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Clock, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.replace("#", ""));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("ring-2", "ring-primary/60");
      setTimeout(
        () => target.classList.remove("ring-2", "ring-primary/60"),
        2000,
      );
    }
  }, [location.hash, documents]);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data.documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = async (docId, docName) => {
    const confirmed = window.confirm(
      `Delete "${docName}"? This will remove all its chunks.`,
    );
    if (!confirmed) return;

    try {
      await axios.delete(`${API}/documents/${docId}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      toast.success("Document deleted");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-heading font-bold text-foreground mb-2">
          Document Library
        </h1>
        <p className="text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? "s" : ""} in your
          knowledge base
        </p>
      </motion.div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <GlassCard className="text-center py-16">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No documents yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Upload your first document to get started
          </p>
          <a
            href="/upload"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            data-testid="upload-first-document"
          >
            Upload Document
          </a>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard
                id={`doc-${doc.id}`}
                className="h-full hover:scale-[1.02] transition-transform cursor-pointer"
                data-testid={`document-card-${index}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      {doc.chunk_count} chunks
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.name)}
                      className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
                  {doc.name}
                </h3>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {formatDate(doc.upload_date)}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
