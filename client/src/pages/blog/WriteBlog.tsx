import { useState, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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

const WriteBlog = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const textLength = useMemo(() => getTextLength(content), [content]);

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const image = e.target.files?.[0];
    if (!image) return;
    const options = { maxSizeMB: 1, useWebWorker: true };
    try {
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
      const compressedFile = await imageCompression(image, options);
      const fileWithName = new File([compressedFile], image.name, {
        type: compressedFile.type,
      });
      setThumbnail(fileWithName);
    } catch (err) {
      console.error("Image compression failed:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.length === 0) {
      toast({ description: "Title required.", variant: "destructive" });
      return;
    }
    if (textLength < 1000) {
      toast({
        description: `Content must be at least 1000 characters. Currently ${textLength}/1000.`,
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (thumbnail) formData.append("thumbnail", thumbnail);
    formData.append("description", description);

    try {
      await api.post("/blogs/create", formData);
      setContent("");
      setDescription("");
      setThumbnail(null);
      setTitle("");
      setLoading(false);
      navigate("/blogs");
      toast({
        title: "Blog published successfully!",
        description: "It will be reviewed once to prevent spam.",
      });
    } catch (err: any) {
      setLoading(false);
      toast({
        title: "Something went wrong publishing blog.",
        description: err.response?.data,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-space-dark text-white">
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

      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Write a Blog</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Share your insights, stories, or research with the space community.
          </p>
        </div>

        <form className="space-y-6 max-w-4xl mx-auto" onSubmit={handleSubmit}>
          {/* Guidelines */}
          <div className="bg-space-purple/10 border border-space-purple/30 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-space-accent mb-3">
              Publishing Guidelines
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm">
              <li>
                Thumbnail: max <strong>5MB</strong>; formats:{" "}
                <code>.jpg</code>, <code>.jpeg</code>, <code>.png</code>.
              </li>
              <li>
                Max <strong>2 blogs per day</strong>.
              </li>
              <li>
                Your blog will be <strong>reviewed before publishing</strong>.
              </li>
              <li>
                Check your blog's status on the dashboard:{" "}
                <em>Pending</em>, <em>Approved</em>, or <em>Rejected</em>.
              </li>
            </ul>
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Thumbnail Image
            </label>
            <input
              type="file"
              name="thumbnail"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="block w-full text-sm text-gray-300 file:bg-space-purple/30 file:border-0 file:px-4 file:py-2 file:rounded file:text-white hover:file:bg-space-purple/50 transition"
            />
          </div>

          {/* Blog Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Blog Title
            </label>
            <input
              type="text"
              placeholder="Enter the blog title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-space-purple/20 border border-space-purple/50 rounded-md focus:outline-none focus:ring-2 focus:ring-space-accent"
            />
          </div>

          {/* Blog Content — React Quill */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Content{" "}
              <span className="text-gray-500 text-xs">(min 1000 characters)</span>
            </label>
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Start writing your blog..."
            />
            <p
              className={`text-xs mt-1 ${
                textLength < 1000 ? "text-gray-500" : "text-green-500"
              }`}
            >
              {textLength} / 1000 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description{" "}
              <span className="text-gray-500 text-xs">(max 180 chars)</span>
            </label>
            <textarea
              placeholder="A brief summary shown on the blog card..."
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, 180))
              }
              rows={3}
              className="w-full px-4 py-2 bg-space-purple/20 border border-space-purple/50 rounded-md focus:outline-none focus:ring-2 focus:ring-space-accent resize-none"
            />
            <p className="text-gray-500 text-xs">
              {180 - description.length} / 180 remaining
            </p>
          </div>

          {/* Submit */}
          <div className="text-center">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-space-accent hover:bg-space-accent/80 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              {loading ? <Spinner /> : "Publish Blog"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default WriteBlog;
