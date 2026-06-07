import { useState } from "react";
import api from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/ui/Spinner";
import SpinnerOverlay from "@/components/ui/SpinnerOverlay";
import { Helmet } from "react-helmet-async";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const fetchJobs = async () => {
  const res = await api.get("/jobs/");
  // return res.data.data;
  return res.data?.data || res.data || [];
};

const fieldInputClass =
  "w-full p-3 rounded-md border border-gray-700/80 bg-gray-800/80 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-space-purple/40";
const descriptionTextareaClass = `${fieldInputClass} min-h-[160px] resize-y`;

const AdminJobs = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // const [creatingJob, setCreatingJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  // const [isEditingDeleting, setIsEditingDeleting] = useState(false);

  const [newJobFormData, setNewJobFormData] = useState({
    title: "",
    role: "",
    description: "",
    applyLink: "",
    document: null,
  });

  const [editJobFormData, setEditJobFormData] = useState({
    title: "",
    role: "",
    description: "",
    applyLink: "",
  });

  // Fetch jobs with useQuery
  const {
    data: jobs = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  });

  //Create Job
  const createJobMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Object.entries(newJobFormData).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          formData.append(key, val);
        }
      });

      await api.post(`/jobs/`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast({ description: "Job created successfully." });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setNewJobFormData({
        title: "",
        role: "",
        description: "",
        applyLink: "",
        document: null,
      });
    },
    onError: () => toast({ description: "Something went wrong!" }),
  });

  // Delete Job
  const deleteJobMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/jobs/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Job deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast({ description: "Something went wrong deleting job!" }),
  });

  // Update Job
  const updateJobMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/jobs/${editingJobId}`, editJobFormData);
    },
    onSuccess: () => {
      toast({ description: "Job updated successfully." });
      setEditingJobId(null);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => {
      toast({ description: "Something went wrong updating job!" });
    },
  });

  const handleNewJobFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "document") {
      const file = files[0];
      if (
        file &&
        ![
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
        ].includes(file.type)
      ) {
        alert("Only PDF, DOCX, and DOC files are allowed.");
        e.target.value = "";
        return;
      }
      setNewJobFormData({ ...newJobFormData, document: file });
    } else {
      setNewJobFormData({ ...newJobFormData, [name]: value });
    }
  };

  const handleEditJobFormChange = (e) => {
    const { name, value } = e.target;
    setEditJobFormData({ ...editJobFormData, [name]: value });
  };

  const handleEditJobClick = (job) => {
    setEditingJobId(job._id);
    setEditJobFormData({
      title: job.title,
      role: job.role,
      description: job.description,
      applyLink: job.applyLink,
    });
  };

  if (isLoading)
    return <SpinnerOverlay show={isLoading}>{null}</SpinnerOverlay>;
  if (isError) return <p className="text-red-500">Error loading jobs...</p>;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Admin: Jobs | ISA-India</title>
        <meta name="description" content="Admin page for managing jobs." />
      </Helmet>

      <Card className="bg-space-purple/10 border-space-purple/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Create New Job</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createJobMutation.mutate();
            }}
            className="space-y-4"
          >
            <input
              type="text"
              name="title"
              value={newJobFormData.title}
              onChange={handleNewJobFormChange}
              placeholder="Job Title*"
              className={fieldInputClass}
              required
            />
            <input
              type="text"
              name="role"
              value={newJobFormData.role}
              onChange={handleNewJobFormChange}
              placeholder="Job Role"
              className={fieldInputClass}
              required
            />
            <textarea
              name="description"
              value={newJobFormData.description}
              onChange={handleNewJobFormChange}
              placeholder="Job Description"
              className={descriptionTextareaClass}
              required
            />
            <label htmlFor="applyLink" className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-400">Apply Link</span>
              <input
                id="applyLink"
                type="url"
                name="applyLink"
                value={newJobFormData.applyLink}
                onChange={handleNewJobFormChange}
                placeholder="https://..."
                className={fieldInputClass}
                required
              />
            </label>
            <label htmlFor="document" className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-400">
                Attachment (PDF, DOCX, DOC)
              </span>
              <input
                id="document"
                type="file"
                name="document"
                onChange={handleNewJobFormChange}
                className={`${fieldInputClass} file:mr-3 file:rounded file:border-0 file:bg-space-purple/30 file:px-3 file:py-1 file:text-sm file:text-white`}
              />
            </label>

            <Button type="submit" className="w-full">
              {createJobMutation.isPending ? <Spinner /> : "Create Job"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Posted Jobs</h2>
        <ul className="space-y-4">
          <SpinnerOverlay
            show={deleteJobMutation.isPending || updateJobMutation.isPending}
          >
            {jobs.map((job) => (
              <li
                key={job._id}
                className="rounded-lg border border-space-purple/30 bg-space-purple/10 p-5 shadow-sm"
              >
                {editingJobId === job._id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      name="title"
                      value={editJobFormData.title}
                      onChange={handleEditJobFormChange}
                      placeholder="Job Title"
                      className={fieldInputClass}
                    />
                    <input
                      type="text"
                      name="role"
                      value={editJobFormData.role}
                      onChange={handleEditJobFormChange}
                      placeholder="Job Role"
                      className={fieldInputClass}
                    />
                    <textarea
                      name="description"
                      value={editJobFormData.description}
                      onChange={handleEditJobFormChange}
                      placeholder="Job Description"
                      className={descriptionTextareaClass}
                    />
                    <input
                      type="url"
                      name="applyLink"
                      value={editJobFormData.applyLink}
                      onChange={handleEditJobFormChange}
                      placeholder="Apply Link"
                      className={fieldInputClass}
                    />

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => updateJobMutation.mutate()}
                        variant="default"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setEditingJobId(null)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1 border-b border-gray-700/50 pb-3">
                      <h3 className="text-lg font-semibold leading-snug text-white">
                        {job.title}
                      </h3>
                      <p className="text-sm text-gray-400">{job.role}</p>
                    </div>

                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Description
                      </span>
                      <p className="mt-1 block whitespace-pre-line leading-relaxed text-gray-300">
                        {job.description}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Apply Link
                      </span>
                      <a
                        href={job.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-words text-sm text-blue-400 hover:underline"
                      >
                        {job.applyLink}
                      </a>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-gray-700/50 pt-3">
                      <Button
                        size="sm"
                        onClick={() => handleEditJobClick(job)}
                        variant="outline"
                      >
                        <Pencil className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this job? This action cannot be undone.",
                            )
                          ) {
                            deleteJobMutation.mutate(job._id);
                          }
                        }}
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </SpinnerOverlay>
        </ul>
      </section>
    </div>
  );
};

export default AdminJobs;
