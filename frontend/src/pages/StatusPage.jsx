import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Database, Server, CheckCircle, XCircle } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const StatusPage = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const response = await axios.get(`${API}/health`);
      setHealth(response.data);
    } catch (error) {
      console.error("Health check failed:", error);
      setHealth({
        status: "error",
        database: "disconnected",
        llm: "disconnected",
        documents_count: 0,
        chunks_count: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const isHealthy = health?.status === "healthy";

  const indicators = [
    {
      name: "API Server",
      status: isHealthy ? "operational" : "error",
      icon: Server,
    },
    {
      name: "Database",
      status: health?.database === "connected" ? "operational" : "error",
      icon: Database,
    },
    {
      name: "AI Service",
      status: health?.llm === "connected" ? "operational" : "error",
      icon: Activity,
    },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking system status...</p>
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
          System Status
        </h1>
        <p className="text-muted-foreground">
          Real-time health monitoring of all services
        </p>
      </motion.div>

      {/* Overall Status */}
      <GlassCard className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`p-4 rounded-full ${
                isHealthy ? "bg-green-500/10" : "bg-red-500/10"
              }`}
            >
              {isHealthy ? (
                <CheckCircle className="w-8 h-8 text-green-400" />
              ) : (
                <XCircle className="w-8 h-8 text-red-400" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {isHealthy
                  ? "All Systems Operational"
                  : "System Issues Detected"}
              </h2>
              <p className="text-muted-foreground">
                Last checked: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={checkHealth}
            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
            data-testid="refresh-status-button"
          >
            Refresh
          </button>
        </div>
      </GlassCard>

      {/* Service Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {indicators.map((indicator, index) => {
          const Icon = indicator.icon;
          const isOperational = indicator.status === "operational";

          return (
            <motion.div
              key={indicator.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard
                data-testid={`status-indicator-${indicator.name.toLowerCase().replace(" ", "-")}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      isOperational ? "bg-green-500/10" : "bg-red-500/10"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        isOperational ? "text-green-400" : "text-red-400"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {indicator.name}
                    </p>
                    <p
                      className={`text-lg font-semibold ${
                        isOperational ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {indicator.status}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Statistics */}
      <GlassCard>
        <h3 className="text-xl font-semibold text-foreground mb-4">
          Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground mb-1">Documents</p>
            <p className="text-3xl font-bold text-foreground">
              {health?.documents_count || 0}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground mb-1">
              Knowledge Chunks
            </p>
            <p className="text-3xl font-bold text-foreground">
              {health?.chunks_count || 0}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
