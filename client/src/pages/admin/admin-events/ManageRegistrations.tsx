import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/ui/Spinner";
import { Download, CheckCircle, XCircle, Clock, Search, Send, AlertCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";

const ManageRegistrations = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalState, setModalState] = useState({ open: false, type: "", regId: null as string | null, title: "", desc: "" });
  
  // Bulk actions state
  const [selectedRegs, setSelectedRegs] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const openModal = (type: string, regId: string, title: string, desc: string) => {
    setModalState({ open: true, type, regId, title, desc });
  };
  const closeModal = () => setModalState({ open: false, type: "", regId: null, title: "", desc: "" });

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const eventRes = await api.get(`/events/${slug}`);
      setEvent(eventRes.data);

      const regRes = await api.get(`/events/${slug}/registrations`);
      setRegistrations(regRes.data);
    } catch (err) {
      console.error(err);
      toast({ title: "Error fetching data", variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchData();
  }, [slug]);

  const handleAction = async () => {
    const { type, regId } = modalState;
    if (!type || !regId) return;

    setActionLoading(regId);
    closeModal();
    try {
      if (type === 'approve') {
        await api.patch(`/events/registrations/${regId}/approve`);
        toast({ title: "Registration approved" });
      } else if (type === 'review') {
        await api.patch(`/events/registrations/${regId}/review`);
        toast({ title: "Registration flagged for review" });
      } else if (type === 'resend') {
        await api.post(`/events/registrations/${regId}/resend-ticket`);
        toast({ title: "Ticket resent successfully" });
      }
      fetchData(true);
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.response?.data?.message || "Action failed", 
        variant: "destructive" 
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (type: 'approve' | 'resend') => {
    if (selectedRegs.length === 0) return;
    setBulkActionLoading(true);
    try {
      if (type === 'approve') {
        const res = await api.patch(`/events/registrations/bulk-approve`, { regIds: selectedRegs });
        console.log("Bulk approve response:", res.data);
        toast({ title: `Bulk approve completed. ${res.data.results?.successful || res.data?.successful || 0} succeeded, ${res.data.results?.failed || res.data?.failed || 0} failed.` });
      } else if (type === 'resend') {
        const res = await api.post(`/events/registrations/bulk-resend-ticket`, { regIds: selectedRegs });
        console.log("Bulk resend response:", res.data);
        toast({ title: `Bulk resend completed. ${res.data.results?.successful || res.data?.successful || 0} succeeded, ${res.data.results?.failed || res.data?.failed || 0} failed.` });
      }
      setSelectedRegs([]); // clear selection
      fetchData(true);
    } catch (err: any) {
      toast({ title: "Bulk action failed", description: err.response?.data?.message || "An error occurred", variant: "destructive" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const downloadReport = async (filterStatus?: 'flagged' | 'approved') => {
    try {
      const res = await api.get(`/events/${slug}/download-attendees`, {
        responseType: 'blob',
      });
      let data = await res.data.text();
      
      if (filterStatus) {
        const rows = data.split('\n');
        const header = rows[0];
        const filteredRows = rows.slice(1).filter((r: string) => {
          if (filterStatus === 'flagged') return r.includes(',"payment_not_found",');
          if (filterStatus === 'approved') return r.includes(',"approved",');
          return true;
        });
        data = [header, ...filteredRows].join('\n');
      }

      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${event.slug}-${filterStatus ? filterStatus + '-' : ''}registrations.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ description: "Failed to download report.", variant: "destructive" });
    }
  };

  const downloadScannerSheet = async () => {
    try {
      const res = await api.get(`/events/${slug}/download-scanner-sheet`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${event.slug}-scanner-sheet.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ description: "Failed to download scanner sheet.", variant: "destructive" });
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center">Event not found</div>;

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = 
      reg.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      reg.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === "all") return matchesSearch;
    if (filter === "resubmissions") return matchesSearch && reg.isResubmitted && reg.status === "pending";
    if (filter === "pending") return matchesSearch && reg.status === "pending" && !reg.isResubmitted;
    if (filter === "email_failed") return matchesSearch && reg.status === "approved" && reg.emailSent === false;
    return matchesSearch && reg.status === filter;
  });

  const toggleSelection = (id: string) => {
    setSelectedRegs(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedRegs.length === filteredRegistrations.length) {
      setSelectedRegs([]);
    } else {
      setSelectedRegs(filteredRegistrations.map(r => r._id));
    }
  };

  return (
    <div className="min-h-screen bg-space-dark text-white pt-20 px-2 sm:px-4">
      <Helmet>
        <title>Manage Registrations | ISA</title>
      </Helmet>
      
      {modalState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">{modalState.title}</h3>
            <p className="text-sm text-gray-400 mb-6">{modalState.desc}</p>
            <div className="flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md transition text-sm">Cancel</button>
              <button onClick={handleAction} className="px-4 py-2 bg-space-accent hover:bg-space-accent/80 rounded-md transition text-sm font-semibold">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <main className="w-full max-w-7xl mx-auto py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Manage Registrations</h1>
            <p className="text-gray-400">Event: <span className="text-space-accent">{event.title}</span></p>
            <p className="text-sm text-gray-500 mt-1">
              Seats: {event.attendeeCount} / {event.seatCapacity || 'Unlimited'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => navigate(`/events/${slug}`)} 
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors text-sm"
            >
              Back to Event
            </button>
            <button 
              onClick={() => downloadScannerSheet()} 
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md flex items-center gap-2 transition-colors text-sm"
              title="Download Excel sheet for door scanners"
            >
              <Download size={16} /> Scanner Sheet
            </button>
            <button 
              onClick={() => downloadReport()} 
              className="px-4 py-2 bg-space-purple hover:bg-space-purple/80 rounded-md flex items-center gap-2 transition-colors text-sm"
            >
              <Download size={16} /> All CSV
            </button>
            <button 
              onClick={() => downloadReport('approved')} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-2 transition-colors text-sm"
              title="Download only approved registrations"
            >
              <Download size={16} /> Approved CSV
            </button>
            <button 
              onClick={() => downloadReport('flagged')} 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md flex items-center gap-2 transition-colors text-sm"
              title="Download only users with 'payment_not_found' status to easily find who hasn't paid"
            >
              <Download size={16} /> Flagged CSV
            </button>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-800">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, email, or TXN ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-space-accent"
              />
            </div>
            <select 
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setSelectedRegs([]); // clear selection on filter change
              }}
              className="bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-space-accent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="resubmissions">Resubmissions</option>
              <option value="approved">Approved</option>
              <option value="payment_not_found">Payment Not Found</option>
              <option value="email_failed">Email Not Sent</option>
            </select>
          </div>

          {/* Bulk Action Bar */}
          {selectedRegs.length > 0 && (
            <div className="flex items-center flex-wrap gap-3 mb-4 p-3 bg-space-purple/20 border border-space-purple/50 rounded-lg">
              <span className="text-sm font-medium mr-2">{selectedRegs.length} selected</span>
              <button 
                onClick={() => handleBulkAction('approve')}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                {bulkActionLoading ? <div className="flex items-center gap-2"><Spinner /> Processing...</div> : "Approve Selected"}
              </button>
              <button 
                onClick={() => handleBulkAction('resend')}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-space-accent hover:bg-space-accent/80 rounded text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {bulkActionLoading ? <div className="flex items-center gap-2"><Spinner /> Processing...</div> : <><Send size={14} /> Resend Selected</>}
              </button>
            </div>
          )}

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="pb-3 px-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={filteredRegistrations.length > 0 && selectedRegs.length === filteredRegistrations.length}
                      onChange={toggleAll}
                      className="rounded border-gray-600 bg-gray-800 text-space-accent focus:ring-space-accent cursor-pointer"
                    />
                  </th>
                  <th className="pb-3 px-4 font-medium">User</th>
                  <th className="pb-3 px-4 font-medium">Transaction ID</th>
                  <th className="pb-3 px-4 font-medium">Payment Time</th>
                  <th className="pb-3 px-4 font-medium">Status</th>
                  <th className="pb-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No registrations found.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg) => (
                    <tr key={reg._id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="py-4 px-4">
                        <input 
                          type="checkbox" 
                          checked={selectedRegs.includes(reg._id)}
                          onChange={() => toggleSelection(reg._id)}
                          className="rounded border-gray-600 bg-gray-800 text-space-accent focus:ring-space-accent cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">{reg.user?.name}</div>
                        <div className="text-sm text-gray-500">{reg.user?.email}</div>
                        <div className="text-xs text-gray-600">{reg.user?.phoneNo}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-sm text-gray-300">
                        {reg.transactionId || 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-400">
                        {reg.paymentTime ? new Date(reg.paymentTime).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          reg.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                          (reg.status === 'pending' && reg.isResubmitted) ? 'bg-orange-500/10 text-orange-500' :
                          reg.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {reg.status === 'approved' && <CheckCircle size={12} />}
                          {reg.status === 'pending' && <Clock size={12} />}
                          {reg.status === 'payment_not_found' && <XCircle size={12} />}
                          {(reg.status === 'pending' && reg.isResubmitted) ? 'RESUBMITTED' : reg.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {reg.status === 'approved' && (
                          <div className="mt-1.5">
                            {reg.emailSent ? (
                              <span className="text-[10px] text-green-400/80 flex items-center gap-1"><CheckCircle size={10} /> Email Sent</span>
                            ) : (
                              <span className="text-[10px] text-red-400/90 flex items-center gap-1 font-bold"><AlertCircle size={10} /> Email Failed</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {actionLoading === reg._id ? (
                          <div className="inline-block"><Spinner /></div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            {reg.status !== 'approved' && (
                              <button 
                                onClick={() => openModal('approve', reg._id, "Approve Registration", "Are you sure you want to approve this payment? This will decrement available seats and email the ticket to the user.")}
                                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-medium transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            {reg.status !== 'payment_not_found' && (
                              <button 
                                onClick={() => openModal('review', reg._id, "Flag Registration", "Are you sure you want to flag this? The user's status will change to 'Payment Not Found' and they will receive an email asking them to re-verify their UTR.")}
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
                              >
                                Flag
                              </button>
                            )}
                            {reg.status === 'approved' && (
                              <button 
                                onClick={() => openModal('resend', reg._id, "Resend Ticket", "Are you sure you want to resend the ticket to this user?")}
                                className="px-3 py-1 bg-space-accent hover:bg-space-accent/80 rounded text-sm font-medium transition-colors flex items-center gap-1"
                                title="Resend Ticket"
                              >
                                <Send size={14} /> Resend
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Cards */}
          <div className="md:hidden flex flex-col gap-4">
            {filteredRegistrations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-800/30 rounded-lg">No registrations found.</div>
            ) : (
              filteredRegistrations.map((reg) => (
                <div key={reg._id} className="bg-gray-800/40 p-4 rounded-lg border border-gray-700/50 flex flex-col gap-3 relative">
                  <div className="absolute top-4 right-4">
                    <input 
                      type="checkbox" 
                      checked={selectedRegs.includes(reg._id)}
                      onChange={() => toggleSelection(reg._id)}
                      className="rounded border-gray-600 bg-gray-800 text-space-accent focus:ring-space-accent w-5 h-5 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between items-start pr-8">
                    <div>
                      <div className="font-bold text-lg">{reg.user?.name}</div>
                      <div className="text-sm text-gray-400">{reg.user?.email}</div>
                      <div className="text-xs text-gray-500">{reg.user?.phoneNo}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      reg.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      (reg.status === 'pending' && reg.isResubmitted) ? 'bg-orange-500/20 text-orange-400' :
                      reg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {(reg.status === 'pending' && reg.isResubmitted) ? 'RESUBMITTED' : reg.status.replace('_', ' ')}
                    </span>
                    {reg.status === 'approved' && (
                      <div>
                        {reg.emailSent ? (
                          <span className="text-[10px] text-green-400/80 flex items-center gap-1"><CheckCircle size={10} /> Email Sent</span>
                        ) : (
                          <span className="text-[10px] text-red-400/90 flex items-center gap-1 font-bold"><AlertCircle size={10} /> Email Failed</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-black/30 p-2 rounded text-xs font-mono text-gray-300 mt-1">
                    TXN: {reg.transactionId || 'N/A'}
                  </div>

                  <div className="text-xs text-gray-500">
                    Paid: {reg.paymentTime ? new Date(reg.paymentTime).toLocaleString() : 'N/A'}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/50 mt-1">
                    {actionLoading === reg._id ? (
                      <div className="flex w-full justify-center py-2"><Spinner /></div>
                    ) : (
                      <>
                        {reg.status !== 'approved' && (
                          <button 
                            onClick={() => openModal('approve', reg._id, "Approve Registration", "Are you sure you want to approve this payment? This will decrement available seats and email the ticket to the user.")}
                            className="flex-1 py-2 bg-green-600/90 hover:bg-green-500 rounded text-sm font-medium transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {reg.status !== 'payment_not_found' && (
                          <button 
                            onClick={() => openModal('review', reg._id, "Flag Registration", "Are you sure you want to flag this? The user's status will change to 'Payment Not Found' and they will receive an email asking them to re-verify their UTR.")}
                            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
                          >
                            Flag
                          </button>
                        )}
                        {reg.status === 'approved' && (
                          <button 
                            onClick={() => openModal('resend', reg._id, "Resend Ticket", "Are you sure you want to resend the ticket to this user?")}
                            className="flex-1 py-2 bg-space-accent hover:bg-space-accent/80 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <Send size={14} /> Resend
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManageRegistrations;
