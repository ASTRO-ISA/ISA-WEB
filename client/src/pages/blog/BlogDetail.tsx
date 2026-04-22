import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/ui/Spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Trash2 } from "lucide-react";

interface BlogAuthor {
  _id: string;
  name: string;
  avatar?: string;
}

interface Blog {
  _id: string;
  title: string;
  description?: string;
  content: string;
  thumbnail: string;
  slug: string;
  createdAt: string;
  author: BlogAuthor;
  likes: string[];
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(html: string): TocItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h1, h2, h3");
  const items: TocItem[] = [];
  headings.forEach((el, i) => {
    const id = `heading-${i}`;
    el.id = id;
    items.push({
      id,
      text: el.textContent || "",
      level: parseInt(el.tagName[1]),
    });
  });
  return items;
}

function injectHeadingIds(html: string): string {
  let index = 0;
  return html.replace(/<(h[1-3])([\s>])/gi, (_match, tag, rest) => {
    return `<${tag} id="heading-${index++}"${rest}`;
  });
}

const BlogDetail = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { userInfo, isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  const {
    data: blog,
    isLoading,
    isError,
  } = useQuery<Blog>({
    queryKey: ["blog", slug],
    queryFn: () => api.get(`/blogs/${slug}`).then((r) => r.data),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    enabled: !!slug,
  });

  const tocItems = blog ? extractHeadings(blog.content) : [];
  const processedContent = blog ? injectHeadingIds(blog.content) : "";

  useEffect(() => {
    if (!blog || tocItems.length === 0) return;
    const observers: IntersectionObserver[] = [];

    tocItems.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [blog, processedContent]);

  const userId = userInfo?.user?._id ? String(userInfo.user._id) : null;
  const isLiked = blog?.likes?.map(String).includes(userId ?? "") ?? false;

  const likeMutation = useMutation({
    mutationFn: (action: "like" | "unlike") =>
      api[action === "like" ? "post" : "delete"](`/blogs/${action}/${blog!._id}`),
    onMutate: async (action) => {
      await queryClient.cancelQueries({ queryKey: ["blog", slug] });
      const prev = queryClient.getQueryData<Blog>(["blog", slug]);
      if (prev && userId) {
        queryClient.setQueryData<Blog>(["blog", slug], {
          ...prev,
          likes:
            action === "like"
              ? [...prev.likes, userId]
              : prev.likes.filter((id) => id !== userId),
        });
      }
      return { prev };
    },
    onError: (_err, _action, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["blog", slug], ctx.prev);
      toast({ description: "Something went wrong.", variant: "destructive" });
    },
  });

  const handleLike = () => {
    if (!isLoggedIn) {
      toast({ description: "Log in to like blogs.", variant: "destructive" });
      return;
    }
    likeMutation.mutate(isLiked ? "unlike" : "like");
  };

  const deleteBlog = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/blogs/delete/${id}`);
      toast({ description: "Blog deleted successfully." });
      navigate("/blogs");
    } catch (err: any) {
      toast({ description: "Something went wrong deleting the blog." });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteClick = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this blog? This action can't be undone."
      )
    ) {
      deleteBlog(blog!._id);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-400">
        <Spinner /> <span className="ml-3">Loading blog…</span>
      </div>
    );
  if (isError || !blog)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-400">
        Blog not found.
      </div>
    );

  const date = new Date(blog.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const isAuthor =
    userInfo && blog.author?._id === String(userInfo.user?._id);
  const likeCount = blog.likes?.length ?? 0;

  return (
    <div className="min-h-screen bg-space-dark text-white">
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Flex row: ToC on LEFT, article on RIGHT */}
          <div className={`flex gap-10 ${tocItems.length > 0 ? "md:flex-row" : ""} flex-col`}>

            {/* ── ToC Sidebar (md+ only, left side) ── */}
            {tocItems.length > 0 && (
              <aside className="hidden md:block w-64 shrink-0">
                <div className="sticky top-28">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
                    On this page
                  </p>
                  <nav className="space-y-1">
                    {tocItems.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document
                            .getElementById(item.id)
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={`block text-sm py-1 transition-all duration-150 truncate ${
                          item.level === 1 ? "pl-0" : item.level === 2 ? "pl-3" : "pl-6"
                        } ${
                          activeId === item.id
                            ? "text-space-accent font-medium"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}

            {/* ── Main Content ── */}
            <article className={`flex-1 min-w-0 max-w-4xl ${tocItems.length === 0 ? "mx-auto" : ""}`}>
              {/* Thumbnail */}
              <div className="rounded-xl overflow-hidden mb-8 aspect-[16/9]">
                <img
                  src={blog.thumbnail}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Header */}
              <div className="mb-6">
                <h1 className="text-4xl font-bold mb-3 text-center leading-tight">
                  {blog.title}
                </h1>
                {blog.description && (
                  <p className="text-center text-gray-400 text-lg mb-4">
                    {blog.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-4 text-gray-400 text-sm">
                  <span>
                    BY:{" "}
                    <span className="text-gray-300 font-medium">
                      {blog.author?.name?.toUpperCase()}
                    </span>
                  </span>
                  <span>·</span>
                  <span>{formattedDate}</span>
                  <span>·</span>
                  <span>{formattedTime}</span>
                </div>
              </div>

              <hr className="border-gray-700 mb-8" />

              {/* Blog Content */}
              <div
                ref={contentRef}
                className="ql-content"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />

              {/* Like + Author section */}
              <div className="mt-12 pt-6 border-t border-gray-700 space-y-6">
                {/* Like button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleLike}
                    disabled={likeMutation.isPending}
                    aria-label={isLiked ? "Unlike this blog" : "Like this blog"}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border font-medium text-sm transition-all duration-200 ${
                      isLiked
                        ? "bg-rose-500/20 border-rose-500 text-rose-400 hover:bg-rose-500/30"
                        : "bg-transparent border-gray-600 text-gray-400 hover:border-rose-400 hover:text-rose-400"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 transition-all ${isLiked ? "fill-rose-400 stroke-rose-400" : ""}`}
                    />
                    <span>{likeCount}</span>
                    <span>{isLiked ? "Liked" : "Like"}</span>
                  </button>
                </div>

                {/* Author card */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage
                      src={blog.author?.avatar}
                      alt={blog.author?.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl bg-space-purple">
                      {blog.author?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-white">
                      {blog.author?.name}
                    </h4>
                    <p className="text-sm text-gray-500">Author</p>
                  </div>
                </div>

                {/* Author action buttons */}
                {isAuthor && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={handleDeleteClick}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-500/60 text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400 font-medium text-sm transition-all duration-200 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleting ? "Deleting…" : "Delete Blog"}
                    </button>
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BlogDetail;
