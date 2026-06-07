import { useQuery } from "@tanstack/react-query";
import { Briefcase, Calendar, ExternalLink, FileText, Share2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/Spinner";
import SpinnerOverlay from "@/components/ui/SpinnerOverlay";
import FormatDate from "@/components/ui/FormatDate";
import { useToast } from "@/hooks/use-toast";

const fetchJobs = async () => {
  const res = await api.get("/jobs/");
  return res.data.data;
};

const UserJobs = () => {
  const { toast } = useToast();

  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  });

  const handleShareJob = async (job) => {
    const shareUrl = `${window.location.origin}/training#${job._id}`;
    const shareTitle = `Job Opportunity: ${job.title}`;
    const shareText = `Check out this ${job.role} position on ISA-India!`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ description: "Link copied to clipboard!" });
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        await navigator.clipboard.writeText(shareUrl);
        toast({ description: "Link copied to clipboard!" });
      }
    }
  };

  if (isError)
    return (
      <p className="text-center mt-4 text-red-500">
        Error fetching jobs: {error.message}
      </p>
  );

  if (!jobs || jobs.length === 0)
    return (
      <p className="text-gray-400 italic flex justify-center items-center text-center sm:text-start">
        Nothing to see here right now. Future job and internship postings will appear here!
      </p>
  );

  return (
    <div>
      <SpinnerOverlay show={isLoading}>
        <ul className="space-y-4 mt-4">
          {jobs.map((job) => (
            <li
              key={job._id}
              id={job._id}
              className="cosmic-card bg-space-purple/10 border border-space-purple/20 rounded-lg p-6 space-y-4 scroll-mt-28"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {job.title}
                </h3>
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <Briefcase className="h-4 w-4 shrink-0 text-space-accent" />
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Role
                  </span>
                  <span className="text-gray-300">{job.role}</span>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Description
                </p>
                <p className="text-gray-300 whitespace-pre-line leading-relaxed">
                  {job.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {job.applyLink && (
                  <a
                    href={job.applyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full break-words"
                  >
                    <Button className="bg-space-accent hover:bg-space-accent/90 text-white font-semibold shadow-md shadow-space-accent/25 gap-2">
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      Apply Now
                    </Button>
                  </a>
                )}
                {job.documentUrl && (
                  <a
                    href={`https://docs.google.com/viewer?url=${encodeURIComponent(
                      job.documentUrl
                    )}&embedded=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full break-words"
                  >
                    <Button
                      variant="outline"
                      className="border-space-purple/40 text-gray-200 hover:bg-space-purple/20 hover:text-white gap-2"
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      View Document
                    </Button>
                  </a>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleShareJob(job)}
                  className="border-space-purple/40 text-gray-200 transition-all hover:bg-space-purple/20 hover:text-white gap-2"
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  Share
                </Button>
              </div>

              <p className="flex items-center gap-2 border-t border-space-purple/20 pt-4 text-xs text-gray-500">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-space-accent" />
                <span className="font-medium uppercase tracking-wide">Posted on</span>
                <FormatDate date={job.createdAt} />
              </p>
            </li>
          ))}
        </ul>
      </SpinnerOverlay>
    </div>
  );
};

export default UserJobs;
