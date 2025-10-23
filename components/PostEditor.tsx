"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Tiptap, { TiptapRef } from "./Tiptap";
import { ImageThumbnail, ImageData } from "./ImageThumbnail";
import format from "date-fns/format";
import formatInTimeZone from "date-fns-tz/formatInTimeZone";
import {
  deletePost,
  unPublishPost,
  upsertPost,
  sendPostEmail,
  autosaveDraftPost,
} from "@/lib/actions/blog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { getBlogPostsPath, getBlogPostEditPath } from "@/lib/paths";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Save,
  Send,
  Eye,
  Trash2,
  Clock,
  Calendar,
  FileText,
  Mail,
  MailCheck,
  ArrowLeft,
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

export default function PostEditor({
  blogId,
  existingPostId = null,
  existingTitle = "",
  existingContent = "",
  existingPublishedAt = null,
  existingEmailSent = false,
}: {
  blogId: string;
  existingPostId?: string | null;
  existingTitle?: string;
  existingContent?: string;
  existingPublishedAt?: Date | null;
  existingEmailSent?: boolean;
}) {
  const router = useRouter();
  const [postId, setPostId] = useState(existingPostId);
  const [title, setTitle] = useState(existingTitle);
  const [content, setContent] = useState(existingContent);
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    existingPublishedAt
  );
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(existingEmailSent);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Image upload state
  const [images, setImages] = useState<ImageData[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<TiptapRef>(null);

  // Autosave state
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showAutosaveStatus, setShowAutosaveStatus] = useState(false);
  const [lastAutosaved, setLastAutosaved] = useState<Date | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef({ title: existingTitle, content: existingContent });

  // Refs to always access the latest values
  const currentTitleRef = useRef(existingTitle);
  const currentContentRef = useRef(existingContent);
  const currentPostIdRef = useRef(existingPostId);
  const isAutosavingRef = useRef(false);

  // Update refs whenever values change
  useEffect(() => {
    currentTitleRef.current = title;
    currentContentRef.current = content;
  }, [title, content]);

  useEffect(() => {
    currentPostIdRef.current = postId;
  }, [postId]);

  // Load images when postId changes
  useEffect(() => {
    if (postId) {
      loadImages();
    }
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadImages = async () => {
    if (!postId) return;

    try {
      const response = await fetch(`/api/images?postId=${postId}`);
      if (response.ok) {
        const data = await response.json();
        setImages(data);
      }
    } catch (error) {
      console.error("Failed to load images:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);

    try {
      let uploadPostId = postId;

      // If there's no postId yet, auto-save the post first
      if (!uploadPostId) {
        toast("글을 저장하는 중...");

        // For empty posts, we need to call autosaveDraftPost directly
        // because performAutosave returns early for empty posts
        const res = await autosaveDraftPost(blogId, null, title || "", content || "");

        if (res.success && res.postId) {
          uploadPostId = res.postId;
          setPostId(res.postId);
          currentPostIdRef.current = res.postId;
          lastContentRef.current = { title: title || "", content: content || "" };
        } else {
          toast.error("글 저장에 실패했습니다.");
          setIsUploadingImage(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }
      }

      // Upload all files
      const fileArray = Array.from(files);
      const uploadPromises = fileArray.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("postId", uploadPostId);

        const response = await fetch("/api/images/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          return { success: true, image: await response.json() };
        } else {
          const error = await response.json();
          return { success: false, error: error.error || "업로드 실패" };
        }
      });

      const results = await Promise.all(uploadPromises);

      // Process results
      const successfulUploads = results.filter(r => r.success);
      const failedUploads = results.filter(r => !r.success);

      // Add all successful images to state at once
      const newImages = successfulUploads
        .filter((result) => result.success && result.image)
        .map((result) => result.image!);

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);

        // Automatically insert each image into the editor
        newImages.forEach((image) => {
          editorRef.current?.insertImage(image.url, image.filename);
        });
      }

      // Show appropriate toast messages
      if (successfulUploads.length > 0 && failedUploads.length === 0) {
        toast.success(`이미지 ${successfulUploads.length}개가 업로드되었습니다.`);
      } else if (successfulUploads.length > 0 && failedUploads.length > 0) {
        toast.warning(`${successfulUploads.length}개 업로드 성공, ${failedUploads.length}개 실패`);
      } else {
        toast.error("이미지 업로드에 실패했습니다.");
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      toast.error("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImageDelete = async (imageId: string) => {
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        toast.success("이미지가 삭제되었습니다.");
      } else {
        toast.error("이미지 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Image delete failed:", error);
      toast.error("이미지 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleImageClick = (imageUrl: string) => {
    editorRef.current?.insertImage(imageUrl);
  };

  // Autosave function
  const performAutosave = async () => {
    // Get the latest values from refs
    const currentTitle = currentTitleRef.current;
    const currentContent = currentContentRef.current;
    const currentPostId = currentPostIdRef.current;

    // Prevent concurrent autosaves
    if (isAutosavingRef.current) {
      return;
    }

    // Only autosave if post is not published
    if (publishedAt !== null) {
      return;
    }

    // Don't autosave empty posts
    if (!currentTitle.trim() && !currentContent.trim()) {
      return;
    }

    // Check if content actually changed
    if (lastContentRef.current.title === currentTitle && lastContentRef.current.content === currentContent) {
      return;
    }

    // Set autosaving flag
    isAutosavingRef.current = true;

    setAutosaveStatus('saving');
    setShowAutosaveStatus(true);
    
    // Clear any existing fade timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    
    try {
      const res = await autosaveDraftPost(blogId, currentPostId, currentTitle, currentContent);
      
      if (res.success) {
        // Update postId if this was a new post
        if (!currentPostId) {
          setPostId(res.postId);
          // Immediately update the ref to prevent race conditions
          currentPostIdRef.current = res.postId;
          // Don't update URL during autosave to prevent Next.js re-render issues
          // The URL will be updated when user manually saves
        }

        lastContentRef.current = { title: currentTitle, content: currentContent };
        setLastAutosaved(new Date());
        setAutosaveStatus('saved');

        // Start fade out after 2 seconds
        fadeTimeoutRef.current = setTimeout(() => {
          setShowAutosaveStatus(false);
          // Hide completely after fade animation
          setTimeout(() => setAutosaveStatus('idle'), 300);
        }, 2000);
      } else {
        setAutosaveStatus('error');
        // Start fade out after 4 seconds for errors
        fadeTimeoutRef.current = setTimeout(() => {
          setShowAutosaveStatus(false);
          setTimeout(() => setAutosaveStatus('idle'), 300);
        }, 4000);
      }
    } catch (error) {
      console.error('Autosave failed:', error);
      setAutosaveStatus('error');
      // Start fade out after 4 seconds for errors
      fadeTimeoutRef.current = setTimeout(() => {
        setShowAutosaveStatus(false);
        setTimeout(() => setAutosaveStatus('idle'), 300);
      }, 4000);
    } finally {
      // Always clear the autosaving flag
      isAutosavingRef.current = false;
    }
  };

  // Show autosave status immediately when saving starts
  useEffect(() => {
    if (autosaveStatus === 'saving') {
      setShowAutosaveStatus(true);
    }
  }, [autosaveStatus]);

  // Debounced autosave effect
  useEffect(() => {
    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Only autosave if content changed and post is not published
    if (publishedAt === null && (title.trim() || content.trim())) {
      autosaveTimeoutRef.current = setTimeout(() => {
        performAutosave();
      }, 2000); // 2 second delay
    }

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [title, content, publishedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle browser navigation/close to prevent losing unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning for unpublished drafts with unsaved changes
      if (publishedAt === null && 
          (lastContentRef.current.title !== title || lastContentRef.current.content !== content) &&
          (title.trim() || content.trim())) {
        e.preventDefault();
        e.returnValue = ''; // Required for legacy browsers
        
        // Try to trigger autosave if possible (may not complete due to browser constraints)
        performAutosave();
        
        return ''; // Modern browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [title, content, publishedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSavePost(status: "save" | "publish" = "save") {
    setIsLoading(true);
    
    // Clear autosave timeout when manually saving
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    const publishedAtValue =
      status === "publish"
        ? new Date()
        : status === "save"
        ? publishedAt
        : null;
    const res = await upsertPost(
      blogId,
      publishedAtValue,
      postId,
      title,
      content
    );

    if (res.success) {
      const wasNewPost = !postId;
      setPostId(res.postId);

      if (publishedAtValue) {
        setPublishedAt(publishedAtValue);
      }

      // Update last content reference
      lastContentRef.current = { title, content };
      
      // Reset autosave status
      setAutosaveStatus('idle');
      setShowAutosaveStatus(false);
      setLastAutosaved(new Date());
      
      // Clear fade timeout
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }

      const now = new Date();
      toast(
        format(now, "yyyy년 MM월 dd일 HH시 mm분") +
          ` ${status === "save" ? "저장" : "발행"} 완료 ✅`
      );

      // If this was a new post, navigate to the edit URL
      if (wasNewPost) {
        const editPath = getBlogPostEditPath(blogId, res.postId);
        router.replace(editPath);
      }

      setIsLoading(false);
    } else {
      toast("❗️");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    const res = await deletePost(blogId, postId!);

    if (res.success) {
      toast.success("삭제되었습니다.");
      window.location.href = getBlogPostsPath(blogId);
    } else {
      toast.error("삭제에 실패했습니다.");
    }
    setDeleteDialogOpen(false);
  }

  async function handleSendEmail() {
    if (!postId) {
      toast("글을 먼저 발행해야 합니다.");
      return;
    }

    setIsEmailLoading(true);

    try {
      const res = await sendPostEmail(blogId, postId);

      if (res.success) {
        setEmailSent(true);
        toast("이메일이 성공적으로 발송되었습니다! ✅");
      } else {
        toast(`이메일 발송 실패: ${res.message}`);
      }
    } catch (error) {
      toast("이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setIsEmailLoading(false);
    }
  }

  // Calculate post statistics
  const wordCount = useMemo(() => {
    let cleanContent = content;
    let prev;
    do {
      prev = cleanContent;
      cleanContent = cleanContent.replace(/<[^>]*>/g, "");
    } while (cleanContent !== prev);
    cleanContent = cleanContent.trim();
    return cleanContent.split(/\s+/).filter((word) => word.length > 0).length;
  }, [content]);

  const readingTime = useMemo(() => {
    const wordsPerMinute = 200;
    return Math.ceil(wordCount / wordsPerMinute);
  }, [wordCount]);

  // Dynamic min height based on content
  const editorMinHeight = content.length > 500 || title.length > 0 ? 'min-h-[50vh]' : 'min-h-[30vh]';

  const lastSaved = useMemo(() => {
    const now = new Date();
    return formatInTimeZone(now, "Asia/Seoul", "HH:mm");
  }, []);

  return (
    <div className="max-w-prose mx-auto space-y-8" role="main" aria-label="블로그 글 편집">
      {/* Header with navigation and status */}
      <div className="space-y-3 pb-4" role="region" aria-label="글 상태 및 네비게이션">
        {/* Top row: Navigation and time info */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(getBlogPostsPath(blogId))}
            className="gap-2 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">글 목록으로</span>
            <span className="sm:hidden">목록</span>
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            {postId && (
              <>
                <Clock className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {lastAutosaved && publishedAt === null ? (
                    <>자동저장: {formatInTimeZone(lastAutosaved, "Asia/Seoul", "HH:mm")}</>
                  ) : (
                    <>마지막 저장: {lastSaved}</>
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Bottom row: Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {publishedAt ? (
            <Badge variant="default" className="gap-1">
              <Eye className="h-3 w-3" />
              발행됨
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Save className="h-3 w-3" />
              초안
            </Badge>
          )}
          {emailSent && (
            <Badge variant="outline" className="gap-1">
              <MailCheck className="h-3 w-3" />
              이메일 발송됨
            </Badge>
          )}
          
          {/* Autosave status indicator */}
          {publishedAt === null && autosaveStatus !== 'idle' && (
            <div className={`transition-opacity duration-300 ${showAutosaveStatus ? 'opacity-100' : 'opacity-0'}`}>
              {autosaveStatus === 'saving' && (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="hidden sm:inline">자동저장 중</span>
                  <span className="sm:hidden">저장중</span>
                </Badge>
              )}
              {autosaveStatus === 'saved' && (
                <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
                  <CheckCircle className="h-3 w-3" />
                  <span className="hidden sm:inline">자동저장됨</span>
                  <span className="sm:hidden">저장됨</span>
                </Badge>
              )}
              {autosaveStatus === 'error' && (
                <Badge variant="outline" className="gap-1 text-red-600 border-red-200">
                  <AlertCircle className="h-3 w-3" />
                  <span className="hidden sm:inline">저장 실패</span>
                  <span className="sm:hidden">실패</span>
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title input */}
      <Card>
        <CardContent className="p-6">
          <Input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg md:text-xl lg:text-2xl font-bold border-0 px-0 py-3 md:py-4 lg:py-5 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 bg-transparent"
            aria-label="글 제목"
            aria-describedby="title-help"
          />
          <div id="title-help" className="sr-only">
            블로그 글의 제목을 입력하세요. 이 제목은 공개된 글에서 표시됩니다.
          </div>
        </CardContent>
      </Card>

      {/* Main editor with border */}
      <Card>
        <CardContent className="p-6">
          <div role="region" aria-label="글 내용 편집기" aria-describedby="editor-help">
            <Tiptap
              ref={editorRef}
              name="content"
              content={content}
              className={`prose dark:prose-invert max-w-none ${editorMinHeight} focus:outline-none border-0 shadow-none p-0 bg-transparent transition-all duration-300`}
              onChange={(_name, html) => {
                setContent(html);
              }}
            />
          </div>
          <div id="editor-help" className="sr-only">
            리치 텍스트 에디터입니다. 위의 도구모음 버튼을 사용하여 텍스트를 서식화할 수 있습니다.
          </div>
        </CardContent>
      </Card>

      {/* Image upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" />
            이미지
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                multiple
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="gap-2"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    이미지 업로드
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                여러 이미지를 선택할 수 있습니다
              </span>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((image) => (
                  <ImageThumbnail
                    key={image.id}
                    image={image}
                    onDelete={handleImageDelete}
                    onClick={() => handleImageClick(image.url)}
                  />
                ))}
              </div>
            )}

            {images.length === 0 && !isUploadingImage && postId && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                업로드된 이미지가 없습니다
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions - clean card at bottom */}
      <Card className="border-t-2 border-t-border">
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Primary actions with metadata */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" role="region" aria-label="글 작업">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="주요 작업">
                <Button
                  disabled={isLoading}
                  onClick={() => handleSavePost("save")}
                  size="sm"
                  className="gap-2"
                  aria-label="글을 초안으로 저장"
                  title="글을 초안으로 저장합니다"
                >
                  <Save className="h-4 w-4" />
                  저장
                </Button>

                {publishedAt === null ? (
                  <Button
                    disabled={isLoading}
                    onClick={() => handleSavePost("publish")}
                    size="sm"
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    발행
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const res = await unPublishPost(blogId, postId!);
                      if (res.success) {
                        setPublishedAt(null);
                        toast("발행 취소 완료 ✅");
                      }
                    }}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    발행 취소
                  </Button>
                )}

                {publishedAt !== null && postId !== null && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isEmailLoading || emailSent}
                    onClick={handleSendEmail}
                    className="gap-2"
                  >
                    {emailSent ? (
                      <>
                        <MailCheck className="h-4 w-4" />
                        이메일 발송 완료
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        이메일 발송
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Post metadata next to actions */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                {publishedAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatInTimeZone(publishedAt, "Asia/Seoul", "MM/dd HH:mm")}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {wordCount}단어
                </div>
                {readingTime > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {readingTime}분
                  </div>
                )}
              </div>
            </div>

            {/* Secondary actions */}
            {postId !== null && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div></div>
                <AlertDialog
                  open={deleteDialogOpen}
                  onOpenChange={setDeleteDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <Trash2 className="h-4 w-4" />글 삭제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-destructive" />글 삭제
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        정말로 이 글을 삭제하시겠습니까?
                        <br />
                        <br />
                        <span className="text-sm text-destructive font-medium">
                          이 작업은 되돌릴 수 없습니다.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
