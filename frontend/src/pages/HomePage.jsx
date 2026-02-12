import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, MessageSquare, Database, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const HomePage = () => {
  const [stats, setStats] = useState({
    documents: 0,
    chunks: 0,
    status: 'loading'
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/health`);
      setStats({
        documents: response.data.documents_count,
        chunks: response.data.chunks_count,
        status: response.data.status
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({ documents: 0, chunks: 0, status: 'error' });
    }
  };

  const statCards = [
    {
      name: 'Documents',
      value: stats.documents,
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      name: 'Knowledge Chunks',
      value: stats.chunks,
      icon: Database,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      name: 'System Status',
      value: stats.status,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-heading font-bold text-foreground mb-2">
          Private Knowledge Q&A
        </h1>
        <p className="text-muted-foreground">
          Your secure vault for document-based Q&A powered by AI
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard data-testid={`stat-card-${stat.name.toLowerCase().replace(' ', '-')}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.name}</p>
                    <p className="text-3xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <GlassCard>
        <h2 className="text-xl font-heading font-semibold text-foreground mb-4">
          Quick Start
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.a
            href="/upload"
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 p-4 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
            data-testid="quick-action-upload"
          >
            <div className="p-3 rounded-lg bg-primary/20">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Upload Documents</h3>
              <p className="text-sm text-muted-foreground">Add knowledge to your vault</p>
            </div>
          </motion.a>

          <motion.a
            href="/ask"
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 p-4 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors"
            data-testid="quick-action-ask"
          >
            <div className="p-3 rounded-lg bg-accent/20">
              <MessageSquare className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Ask Question</h3>
              <p className="text-sm text-muted-foreground">Query your knowledge base</p>
            </div>
          </motion.a>
        </div>
      </GlassCard>
    </div>
  );
};