import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import imageCompression from "browser-image-compression";
import Spinner from "@/components/ui/Spinner";

// Strip HTML tags to get plain text length for validation
const getTextLength = (html: string) =>
  html.replace(/<[^>]+>/g, "").trim().length;

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    ["blockquote", "code-block"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["link", "image"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "code-block",
  "list",
  "bullet",
  "indent",
  "link",
  "image",
];

interface BlogFormData {
  title: string;
  description: string;
  content: string;
}

export default function EditBlog() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [blogId, setBlogId] = useState<string | null>(null);
  const [currentThumbnail, setCurrentThumbnail] = useState<string>("");

  const [formData, setFormData] = useState<BlogFormData>({
    title: "",
    description: "",
    content: "",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const textLength = useMemo(() => getTextLength(formData.content), [formData.content]);

  // Fetch Blog Details
  useEffect(() => {
    if (!slug) return;
    api
      .get(`/blogs/${slug}`)
      .then((res) => {
        const blog = res.data;
        setBlogId(blog._id);
        setCurrentThumbnail(blog.thumbnail || "");
        setFormData({
          title: blog.title ?? "",
          description: blog.description ?? "",
          content: blog.content ?? "",
        });
      })
      .catch((err) => {
        console.error(err);
        toast({ title: "Error fetching blog details" });
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Handle Input Changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "description") {
      setFormData({ ...formData, [name]: value.slice(0, 180) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleThumbnailChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const image = e.target.files?.[0];
    if (!image) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(image.type)) {
      toast({
        title: "Invalid File Type",
        description: "Only PNG, JPG, and JPEG files are allowed.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    try {
      const compressedFile = await imageCompression(image, {
        maxSizeMB: 1,
        useWebWorker: true,
      });
      const fileWithName = new File([compressedFile], image.name, {
        type: compressedFile.type,
      });
      setThumbnailFile(fileWithName);
    } catch (err) {
      console.error("Image compression failed:", err);
    }
  };

  // Mutation
  const updateMutation = useMutation({
    mutationFn: async (data: BlogFormData) => {
      if (!blogId) throw new Error("Blog ID is missing");
      const fd = new FormData();
      fd.append("title", data.title);
      fd.append("description", data.description);
      fd.append("content", data.content);
      if (thumbnailFile) fd.append("thumbnail", thumbnailFile);
      return api.put(`/blogs/update/${blogId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast({ title: "Blog updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      navigate("/admin");
    },
    onError: () => toast({ title: "Error updating blog" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ description: "Title is required.", variant: "destructive" });
      return;
    }
    if (textLength < 1000) {
      toast({
        description: `Content must be at least 1000 characters. Currently ${textLength}/1000.`,
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    updateMutation.mutate(formData, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-space-dark text-white flex justify-center items-center">
        <Spinner /> <span className="ml-3">Loading blog…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-dark text-white pt-20 px-4">
      <Helmet>
        <title>Admin: Edit Blog | ISA-India</title>
        <meta name="description" content="Admin page for editing a blog." />
      </Helmet>

      {/* Quill dark theme overrides */}
      <style>{`
        .ql-toolbar.ql-snow {
          background: rgba(109, 40, 217, 0.15);
          border: 1px solid rgba(109, 40, 217, 0.4) !important;
          border-bottom: none !important;
          border-radius: 8px 8px 0 0;
        }
        .ql-container.ql-snow {
          background: rgba(109, 40, 217, 0.08);
          border: 1px solid rgba(109, 40, 217, 0.4) !important;
          border-top: none !important;
          border-radius: 0 0 8px 8px;
          min-height: 320px;
          font-size: 1rem;
          color: #e5e7eb;
        }
        .ql-editor {
          min-height: 320px;
          color: #e5e7eb;
          line-height: 1.75;
        }
        .ql-editor.ql-blank::before {
          color: #6b7280;
          font-style: normal;
        }
        .ql-toolbar .ql-stroke { stroke: #9ca3af; }
        .ql-toolbar .ql-fill { fill: #9ca3af; }
        .ql-toolbar .ql-picker-label { color: #9ca3af; }
        .ql-toolbar .ql-picker-options { background: #1a1a2e; border-color: rgba(109,40,217,0.4); }
        .ql-toolbar button:hover .ql-stroke,
        .ql-toolbar button.ql-active .ql-stroke { stroke: #a78bfa; }
        .ql-toolbar button:hover .ql-fill,
        .ql-toolbar button.ql-active .ql-fill { fill: #a78bfa; }
        .ql-toolbar .ql-picker-label:hover,
        .ql-toolbar .ql-picker-item:hover { color: #a78bfa; }
        .ql-editor h1, .ql-editor h2, .ql-editor h3 { color: #f3f4f6; margin-top: 1rem; }
        .ql-editor blockquote { border-left: 3px solid #7c3aed; color: #9ca3af; padding-left: 1rem; }
        .ql-editor pre.ql-syntax { background: #111827; border-radius: 6px; padding: 12px; color: #34d399; }
        .ql-editor a { color: #a78bfa; }
      `}</style>

      <main className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold pt-10">Edit Blog</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Thumbnail Preview */}
            {currentThumbnail && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Thumbnail
                </label>
                <div className="rounded-lg overflow-hidden w-full max-w-md aspect-[16/9]">
                  <img
                    src={currentThumbnail}
                    alt="Current blog thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* New Thumbnail */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Replace Thumbnail (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="block w-full text-sm text-gray-300 file:bg-space-purple/30 file:border-0 file:px-4 file:py-2 file:rounded file:text-white hover:file:bg-space-purple/50 transition"
              />
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm text-gray-400 mb-1"
              >
                Title *
              </label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-space-purple/20 border border-space-purple/50 rounded-md focus:outline-none focus:ring-2 focus:ring-space-accent"
                placeholder="Blog Title *"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Description{" "}
                <span className="text-gray-500 text-xs">(max 180 chars)</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-space-purple/20 border border-space-purple/50 rounded-md focus:outline-none focus:ring-2 focus:ring-space-accent resize-none"
                placeholder="A brief summary shown on the blog card..."
              />
              <p className="text-gray-500 text-xs">
                {180 - formData.description.length} / 180 remaining
              </p>
            </div>

            {/* Content — React Quill */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Content{" "}
                <span className="text-gray-500 text-xs">
                  (min 1000 characters)
                </span>
              </label>
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={(val) => setFormData({ ...formData, content: val })}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Blog content..."
              />
              <p
                className={`text-xs mt-1 ${
                  textLength < 1000 ? "text-gray-500" : "text-green-500"
                }`}
              >
                {textLength} / 1000 characters
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                onClick={() => navigate("/admin")}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
