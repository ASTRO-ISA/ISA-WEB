import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import { QRCodeSVG } from "qrcode.react";

const ManualPaymentModal = ({ event, userId, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [transactionId, setTransactionId] = useState("");

  if (!event) return null;

  const handleProceed = () => {
    if (!agreeToTerms) {
      return toast({
        title: "Please agree to the Terms and Conditions",
        variant: "destructive",
      });
    }
    setStep(2);
  };

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
        title: "Registration Pending",
        description: "Your transaction details have been submitted and are pending verification.",
      });
      onSuccess && onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Manual registration failed:", err.message);
      toast({
        title: "Registration Error",
        description: err.response?.data?.message || err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const upiLink = `upi://pay?pa=${event.upiId}&pn=ISA&am=${event.fee}&cu=INR`;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-space-dark border border-gray-800 rounded-2xl p-6 w-[90%] max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Complete Payment</h2>
        
        {step === 1 ? (
          <>
            <p className="text-gray-300 mb-4">
              You’re about to register for{" "}
              <span className="font-semibold text-white">{event.title}</span>.
            </p>
            <p className="text-gray-400 mb-4">
              Registration Fee:{" "}
              <span className="text-space-accent font-semibold">₹{event.fee}</span>
            </p>

            <div className="flex flex-col mb-6">
              <div className="bg-gray-800/40 border border-gray-700 rounded-md p-3 mb-4">
                <p className="text-sm text-gray-400 leading-relaxed">
                  ⚠️ The registration fee is{" "}
                  <span className="text-red-400 font-semibold">non-refundable</span>.  
                  Please review all details before proceeding.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-space-accent rounded cursor-pointer"
                />
                <label htmlFor="terms" className="text-gray-300 text-sm leading-snug cursor-pointer">
                  I agree to the{" "}
                  <Link
                    to="/terms-and-conditions"
                    className="text-space-accent underline hover:text-space-accent/80"
                    target="_blank"
                  >
                    Terms and Conditions
                  </Link>
                  .
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProceed}
                disabled={!agreeToTerms}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  agreeToTerms
                    ? "bg-space-accent hover:bg-space-accent/80 text-white"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                }`}
              >
                Proceed
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center mb-6">
              <p className="text-gray-300 mb-4 text-center">
                Scan the QR code below using any UPI app (GPay, PhonePe, Paytm) to pay 
                <span className="text-space-accent font-bold ml-1">₹{event.fee}</span>
              </p>
              
              <div className="bg-white p-4 rounded-xl mb-4">
                <QRCodeSVG value={upiLink} size={200} />
              </div>
              
              {/* <p className="text-sm text-gray-400 font-mono mb-2">UPI ID: {event.upiId}</p> */}
            </div>

            <div className="mb-6">
              <label htmlFor="txnId" className="block text-sm font-medium text-gray-300 mb-2">
                12-digit UPI transaction ID (UTR)
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
                <h3 className="text-sm font-semibold text-gray-200 mb-2">How to find your Transaction ID?</h3>
                <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                  After a successful payment, your UPI app will generate a 12-digit numerical code (often called UPI transaction ID, UTR or UPI Ref No).
                  Examples: <strong>325412345678</strong> or <strong>401212345678</strong>.
                </p>
                <p className="text-xs text-gray-500">
                  Ensure this exactly matches the 12 digits shown in your UPI app.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              >
                Back
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
          </>
        )}
      </div>
    </div>
  );
};

export default ManualPaymentModal;
