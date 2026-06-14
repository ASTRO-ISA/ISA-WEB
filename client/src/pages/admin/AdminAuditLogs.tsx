import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import SpinnerOverlay from "@/components/ui/SpinnerOverlay";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";

type AuditLog = {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  createdAt: string;
};

const AdminAuditLogs = () => {
  const [page, setPage] = useState(1);
  const limit = 20;

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["audit-logs", page],
    queryFn: async () => {
      const res = await api.get(`/super-admin/audit-logs?page=${page}&limit=${limit}`);
      return res.data;
    },
  });

  const logs: AuditLog[] = data?.data || [];
  const totalPages = data?.pagination?.pages || 1;

  if (isError)
    return (
      <p className="text-center mt-4 text-red-500">
        Error fetching audit logs: {error.message}
      </p>
    );

  return (
    <div className="p-6 space-y-6">
      <Helmet>
        <title>Admin: Audit Logs | ISA-India</title>
        <meta name="description" content="View system audit logs." />
      </Helmet>
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Audit Logs</h1>
      </div>

      <SpinnerOverlay show={isLoading}>
        {logs.length === 0 ? (
          <p className="p-4 border rounded-xl shadow-md bg-space-purple/20">
            No audit logs found.
          </p>
        ) : (
          <div className="overflow-x-auto bg-space-purple/10 border border-space-purple/30 rounded-lg">
            <table className="min-w-full divide-y divide-space-purple/30 text-sm">
              <thead className="bg-space-dark/50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-300">Timestamp</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-300">User</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-300">Action</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-300">Resource</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-300">Resource ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-purple/20 bg-transparent">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-space-purple/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="px-6 py-4">
                      {log.userId ? (
                        <div>
                          <div className="font-medium text-white">{log.userId.name}</div>
                          <div className="text-xs text-gray-400">{log.userId.email}</div>
                          <div className="text-xs text-space-accent mt-1 uppercase">{log.userRole}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-space-light font-medium">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300 capitalize">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">
                      {log.resourceId || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-4 mt-6">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((old) => Math.max(old - 1, 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((old) => Math.min(old + 1, totalPages))}
            >
              Next
            </Button>
          </div>
        )}
      </SpinnerOverlay>
    </div>
  );
};

export default AdminAuditLogs;
