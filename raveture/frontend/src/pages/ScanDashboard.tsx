import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '@/context';
import { ticketingApi } from '@/services';
import { PageWrapper, GlowButton } from '@/components/design';
import {
  ArrowLeft,
  Users,
  CheckCircle,
  XCircle,
  Activity,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import type { ValidationStats } from '@/types';

interface CheckinDetail {
  id: string;
  ticket_id: string;
  result: string;
  location: string | null;
  scanned_at: string;
  ticket_type_name?: string;
}

export function ScanDashboard() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [recentScans, setRecentScans] = useState<CheckinDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousScansRef = useRef<CheckinDetail[]>([]);
  const feedItemsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!user || (user.role !== 'organizer' && user.role !== 'admin')) {
      navigate('/');
    }
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    if (!eventId) return;

    try {
      const [statsData, scansData] = await Promise.all([
        ticketingApi.getValidationStats(eventId),
        ticketingApi.getCheckinDetails(eventId, { per_page: 15 }),
      ]);

      setStats(statsData);
      setRecentScans(scansData.validations || []);
      setLastUpdated(new Date());

      if (loading) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch scan data:', error);
      if (loading) {
        setLoading(false);
      }
    }
  }, [eventId, loading]);

  useEffect(() => {
    fetchData();

    intervalRef.current = setInterval(() => {
      fetchData();
    }, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData]);

  useEffect(() => {
    if (recentScans.length > 0 && previousScansRef.current.length > 0) {
      const newScan = recentScans[0];
      const previousFirstScan = previousScansRef.current[0];

      if (newScan.id !== previousFirstScan?.id && feedItemsRef.current[0]) {
        gsap.fromTo(
          feedItemsRef.current[0],
          {
            opacity: 0,
            y: -10,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: 'power2.out',
          }
        );
      }
    }

    previousScansRef.current = recentScans;
  }, [recentScans]);

  const getTimeSince = (timestamp: string) => {
    const now = new Date();
    const scannedAt = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - scannedAt.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
  };

  const getLastUpdatedText = () => {
    if (!lastUpdated) return '';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    return `Updated ${diffInSeconds}s ago`;
  };

  const getResultColor = (result: string) => {
    if (result === 'valid') return 'text-green-400';
    if (result === 'already_used') return 'text-amber-400';
    return 'text-red-400';
  };

  const getResultDotColor = (result: string) => {
    if (result === 'valid') return 'bg-green-400';
    if (result === 'already_used') return 'bg-amber-400';
    return 'bg-red-400';
  };

  const getResultLabel = (result: string) => {
    const labels: Record<string, string> = {
      valid: 'Valid',
      already_used: 'Already Used',
      invalid_signature: 'Invalid Signature',
      invalid_status: 'Invalid Status',
      wrong_event: 'Wrong Event',
      not_found: 'Not Found',
    };
    return labels[result] || result;
  };

  const admissionRate =
    stats && stats.total_scans > 0
      ? ((stats.entries_granted / stats.total_scans) * 100).toFixed(1)
      : '0.0';

  const breakdownItems = [
    { key: 'valid', label: 'Valid', color: 'bg-green-500' },
    { key: 'already_used', label: 'Already Used', color: 'bg-amber-500' },
    { key: 'invalid_signature', label: 'Invalid Signature', color: 'bg-red-500' },
    { key: 'invalid_status', label: 'Invalid Status', color: 'bg-red-500' },
    { key: 'wrong_event', label: 'Wrong Event', color: 'bg-red-500' },
    { key: 'not_found', label: 'Not Found', color: 'bg-red-500' },
  ];

  if (loading) {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-bg-dark pt-20 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary animate-spin" />
            <span className="text-text-muted">Loading dashboard...</span>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-bg-dark pt-20 pb-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link
              to="/organizer"
              className="flex items-center gap-2 text-text-muted hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                LIVE MONITOR
              </span>
              <span className="text-sm text-text-muted font-mono">
                {eventId?.slice(0, 8)}...
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
              </div>
              <span className="text-sm font-semibold text-green-400">LIVE</span>
              <span className="text-xs text-text-muted ml-2">
                {getLastUpdatedText()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-bg-card border border-border-grey p-6">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-4xl font-bold text-white mb-1">
                {stats?.total_scans || 0}
              </div>
              <div className="text-sm text-text-muted">Total Scans</div>
            </div>

            <div className="bg-bg-card border border-border-grey p-6">
              <div className="flex items-center justify-between mb-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-4xl font-bold text-green-400 mb-1">
                {stats?.entries_granted || 0}
              </div>
              <div className="text-sm text-text-muted">Admitted</div>
            </div>

            <div className="bg-bg-card border border-border-grey p-6">
              <div className="flex items-center justify-between mb-3">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-4xl font-bold text-red-400 mb-1">
                {stats?.rejected || 0}
              </div>
              <div className="text-sm text-text-muted">Rejected</div>
            </div>

            <div className="bg-bg-card border border-border-grey p-6">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="text-4xl font-bold text-primary mb-1">
                {admissionRate}%
              </div>
              <div className="text-sm text-text-muted">Admission Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-bg-card border border-border-grey p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">
                    Scan Results Breakdown
                  </h2>
                  <button
                    onClick={fetchData}
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh now
                  </button>
                </div>

                <div className="space-y-4">
                  {breakdownItems.map((item) => {
                    const count = stats?.breakdown?.[item.key as keyof typeof stats.breakdown] || 0;
                    const percentage =
                      stats && stats.total_scans > 0
                        ? (count / stats.total_scans) * 100
                        : 0;

                    if (count === 0 && item.key !== 'valid' && item.key !== 'already_used') {
                      return null;
                    }

                    return (
                      <div key={item.key}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-text-muted">
                            {item.label}
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {count}
                          </span>
                        </div>
                        <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-bg-card border border-border-grey p-6">
                <div className="flex items-center gap-2 mb-6">
                  <h2 className="text-xl font-bold text-white">Live Feed</h2>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>

                {recentScans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Activity className="w-12 h-12 text-text-muted mb-4 animate-spin-slow" />
                    <p className="text-text-muted">Waiting for first scan...</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {recentScans.map((scan, index) => (
                      <div
                        key={scan.id}
                        ref={(el) => {
                          if (el) feedItemsRef.current[index] = el;
                        }}
                        className="flex items-start gap-3 p-3 bg-bg-dark border border-border-grey/50 hover:border-border-grey transition-colors"
                      >
                        <div className="flex-shrink-0 mt-1">
                          <div
                            className={`w-3 h-3 rounded-full ${getResultDotColor(
                              scan.result
                            )}`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-sm font-semibold ${getResultColor(
                                scan.result
                              )}`}
                            >
                              {getResultLabel(scan.result)}
                            </span>
                          </div>
                          <div className="text-xs text-text-muted truncate">
                            {scan.ticket_type_name || 'Unknown type'}
                            {scan.location && ` • ${scan.location}`}
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-xs text-text-muted">
                          {getTimeSince(scan.scanned_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </PageWrapper>
  );
}
