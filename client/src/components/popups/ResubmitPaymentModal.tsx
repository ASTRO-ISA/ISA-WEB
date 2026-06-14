import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import Spinner from "@/components/ui/Spinner";

const ResubmitPaymentModal = ({ event, userId, onClose, onSuccess, onSwitchToPay }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  if (!event) return null;

  const handleSubmit = async () => {
    const txnIdClean = transactionId.trim();
    if (!txnIdClean) {
      return toast({
        title: "UPI transaction ID Required",
        description: "Please enter the 12-digit transaction ID from your UPI app.",
        variant: "destructive",
      });
    }

    if (!/^\d{12}$/.test(txnIdClean)) {
      return toast({
        title: "Invalid Transaction ID",
        description: "UPI Transaction ID (UTR) must be exactly 12 digits long.",
        variant: "destructive",
      });
    }

    setLoading(true);
    try {
      await api.post(`/events/register/manual/${event._id}/${userId}`, {
        transactionId: transactionId.trim()
      });
      toast({
        title: "Registration Resubmitted",
        description: "Your transaction details have been resubmitted and are pending verification.",
      });
      onSuccess && onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Manual registration failed:", err.message);
      toast({
        title: "Resubmission Error",
        description: err.response?.data?.message || err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-space-dark border border-gray-800 rounded-2xl p-6 w-[90%] max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Resubmit Transaction ID</h2>
        
        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            We couldn't verify your previous payment. Please double-check and resubmit your 12-digit UPI transaction ID (UTR).
          </p>

          <label htmlFor="txnId" className="block text-sm font-medium text-gray-300 mb-2">
            12-digit UPI transaction ID
          </label>
          <input
            id="txnId"
            type="text"
            maxLength={12}
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value.replace(/\D/g, ''))} // only allow numbers
            placeholder="e.g. 312345678901"
            className="w-full bg-zinc-800 border border-gray-700 rounded-md px-4 py-3 text-white focus:outline-none focus:border-space-accent font-mono tracking-widest mb-4"
          />
          
          <div className="bg-gray-800/40 border border-gray-700 rounded-md p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">How to find your UPI transaction ID?</h3>
            <p className="text-xs text-gray-400 mb-2 leading-relaxed">
              After a successful payment, your UPI app will generate a 12-digit numerical code (often called UPI transaction ID, UTR or UPI Ref No).
              Examples: <strong>325412345678</strong> or <strong>401212345678</strong>.
            </p>
            <p className="text-xs text-gray-500">
              Ensure this exactly matches the 12 digits shown in your UPI app.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mb-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !transactionId.trim()}
            className={`px-6 py-2 rounded-md font-medium inline-flex items-center justify-center transition-colors ${
              transactionId.trim() && !loading
                ? "bg-space-accent hover:bg-space-accent/80 text-white"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? <Spinner /> : "Submit"}
          </button>
        </div>

        <div className="text-center mt-6 border-t border-gray-800 pt-4">
          <p className="text-sm text-gray-400">
            Payment failed previously and you want to pay again?{" "}
            <button onClick={onSwitchToPay} className="text-space-accent hover:underline focus:outline-none font-semibold">
              Click here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResubmitPaymentModal;
