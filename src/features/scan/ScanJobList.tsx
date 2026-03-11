import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import {
  getUserScanJobs,
  cancelScanJob,
  retryScanJob,
  subscribeToUserJobs,
  ScanJob,
  getJobStatus,
  JobStatus,
} from "./scan-service";
import { getScanThumbnailUrl } from "./scan-photos";
import { useSession } from "@/features/auth/session";

export function ScanJobList() {
  const { session } = useSession();
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<Record<string, JobStatus>>({});

  useEffect(() => {
    loadJobs();

    // Subscribe to real-time updates (requires authenticated user ID)
    if (!session?.user?.id) return;
    const subscription = subscribeToUserJobs(session.user.id, (updatedJob) => {
      setJobs((prev) =>
        prev.map((job) => (job.id === updatedJob.id ? updatedJob : job))
      );
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user?.id]);

  const loadJobs = async () => {
    try {
      const userJobs = await getUserScanJobs();
      setJobs(userJobs);
    } catch (error) {
      console.error("Failed to load scan jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      await cancelScanJob(jobId);
      await loadJobs();
    } catch (error) {
      console.error("Failed to cancel job:", error);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await retryScanJob(jobId);
      await loadJobs();
    } catch (error) {
      console.error("Failed to retry job:", error);
      Alert.alert("Error", "Failed to retry job. Please try again.");
    }
  };

  const loadJobDetails = async (jobId: string) => {
    if (jobDetails[jobId]) return;

    try {
      const details = await getJobStatus(jobId);
      setJobDetails((prev) => ({ ...prev, [jobId]: details }));
    } catch (error) {
      console.error("Failed to load job details:", error);
    }
  };

  const toggleExpanded = (jobId: string) => {
    const isExpanding = expandedJob !== jobId;
    setExpandedJob(isExpanding ? jobId : null);
    
    if (isExpanding) {
      loadJobDetails(jobId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queued":
        return "⏳";
      case "processing":
        return "🔄";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "⏳";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queued":
        return "#f59e0b"; // amber
      case "processing":
        return "#3b82f6"; // blue
      case "completed":
        return "#10b981"; // green
      case "failed":
        return "#ef4444"; // red
      default:
        return "#6b7280"; // gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "queued":
        return "Queued";
      case "processing":
        return "Processing";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getEstimatedTimeRemaining = (status: string, createdAt: string) => {
    if (status === "queued") {
      // Estimate based on queue position and average processing time (2-3 minutes)
      return "Estimate: 1-5 min";
    } else if (status === "processing") {
      // Average OCR processing time is 30-60 seconds
      return "Estimate: < 1 min";
    } else {
      return "";
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Recent Scans</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Scans</Text>

      {jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👁️</Text>
          <Text style={styles.emptyText}>No scan jobs yet</Text>
          <Text style={styles.emptySubtext}>
            Upload a photo to get started
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {jobs.map((job) => {
            const details = jobDetails[job.id];
            const isExpanded = expandedJob === job.id;
            const statusColor = getStatusColor(job.status);

            return (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  {/* Thumbnail */}
                  <Image
                    source={{ uri: getScanThumbnailUrl(job.photo_url, 100) }}
                    style={styles.thumbnail}
                  />

                  {/* Job Info */}
                  <View style={styles.jobInfo}>
                    <View style={styles.statusRow}>
                      <Text style={styles.statusIcon}>
                        {getStatusIcon(job.status)}
                      </Text>
                      <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {getStatusText(job.status)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.jobId}>
                      Job #{job.id.slice(0, 8)}
                    </Text>
                    <Text style={styles.jobTime}>
                      {formatTimeAgo(job.created_at)}
                    </Text>
                    {job.status === "queued" || job.status === "processing" ? (
                      <Text style={styles.estimatedTime}>
                        {getEstimatedTimeRemaining(job.status, job.created_at)}
                      </Text>
                    ) : null}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        onPress={() => toggleExpanded(job.id)}
                        style={styles.actionButton}
                      >
                        <Text style={styles.actionButtonText}>
                          {isExpanded ? "Hide Details" : "Show Details"}
                        </Text>
                      </TouchableOpacity>

                      {job.status === "queued" && (
                        <TouchableOpacity
                          onPress={() => handleCancel(job.id)}
                          style={[styles.actionButton, styles.cancelButton]}
                        >
                          <Text style={styles.cancelButtonText}>✖ Cancel</Text>
                        </TouchableOpacity>
                      )}

                      {job.status === "failed" && job.retry_count < job.max_retries && (
                        <TouchableOpacity
                          onPress={() => handleRetry(job.id)}
                          style={[styles.actionButton, styles.retryButton]}
                        >
                          <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedDetails}>
                    {details ? (
                      <View style={styles.detailsContent}>
                        <DetailRow
                          label="Job ID:"
                          value={job.id}
                          valueStyle={styles.monospace}
                        />
                        <DetailRow
                          label="Created:"
                          value={new Date(details.created_at).toLocaleString()}
                        />
                        <DetailRow
                          label="Last Updated:"
                          value={new Date(details.updated_at).toLocaleString()}
                        />
                        <DetailRow
                          label="Retry Attempts:"
                          value={`${details.retry_count} / ${details.max_retries}`}
                        />

                        {job.error_message && (
                          <View style={styles.errorContainer}>
                            <Text style={styles.errorLabel}>Error:</Text>
                            <Text style={styles.errorMessage}>
                              {job.error_message}
                            </Text>
                          </View>
                        )}

                        {job.status === "completed" && (
                          <TouchableOpacity
                            style={styles.viewResultsButton}
                            onPress={() => router.push(`/scan/draft/${job.id}`)}
                          >
                            <Text style={styles.viewResultsButtonText}>
                              View Scan Results →
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <View style={styles.detailsLoading}>
                        <ActivityIndicator size="small" color="#3b82f6" />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  valueStyle?: any;
}

function DetailRow({ label, value, valueStyle }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
  },
  jobCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  jobHeader: {
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  jobId: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  jobTime: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 8,
  },
  estimatedTime: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  actionButton: {
    marginRight: 8,
    marginBottom: 4,
  },
  cancelButton: {
    backgroundColor: "#fef2f2",
  },
  cancelButtonText: {
    color: "#dc2626",
    fontSize: 12,
  },
  retryButton: {
    backgroundColor: "#eff6ff",
  },
  retryButtonText: {
    color: "#2563eb",
    fontSize: 12,
  },
  actionButtonText: {
    color: "#3b82f6",
    fontSize: 12,
  },
  expandedDetails: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailsContent: {
    // Details content styles
  },
  detailsLoading: {
    alignItems: "center",
    paddingVertical: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
    textAlign: "right",
  },
  monospace: {
    fontFamily: "monospace",
    fontSize: 12,
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#dc2626",
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 12,
    color: "#b91c1c",
  },
  viewResultsButton: {
    marginTop: 12,
    alignItems: "flex-start",
  },
  viewResultsButtonText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "500",
  },
});