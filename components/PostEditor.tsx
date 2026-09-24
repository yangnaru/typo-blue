"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Tiptap, { TiptapRef } from "./Tiptap";
import { ImageThumbnail, ImageData } from "./ImageThumbnail";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  deletePost,
  unPublishPost,
  upsertPost,
  sendPostEmail,
  autosaveDraftPost,
} from "@/lib/actions/blog";
import { Button } from "./ui/button";
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
import { inputClassName } from "@/lib/form-styles";

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
    if (!postId) return;

    let cancelled = false;
    fetch(`/api/images?postId=${postId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && !cancelled) setImages(data);
      })
      .catch((error) => console.error("Failed to load images:", error));
    return () => {
      cancelled = true;
    };
  }, [postId]);

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

      // Upload all files using presigned URLs
      const fileArray = Array.from(files);
      const uploadPromises = fileArray.map(async (file) => {
        try {
          // Step 1: Extract image metadata client-side
          const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              resolve({ width: img.width, height: img.height });
              URL.revokeObjectURL(img.src);
            };
            img.onerror = () => {
              reject(new Error("Failed to load image"));
              URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);
          });

          // Step 2: Request presigned upload URL
          const uploadUrlResponse = await fetch("/api/images/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              postId: uploadPostId,
              filename: file.name,
              width: dimensions.width,
              height: dimensions.height,
              contentType: file.type,
              size: file.size,
            }),
          });

          if (!uploadUrlResponse.ok) {
            const error = await uploadUrlResponse.json();
            return { success: false, error: error.error || "업로드 URL 생성 실패" };
          }

          const { presignedUrl, imageId } = await uploadUrlResponse.json();

          // Step 3: Upload directly to R2 using presigned PUT
          const uploadResponse = await fetch(presignedUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });

          if (!uploadResponse.ok) {
            return { success: false, error: "R2 업로드 실패" };
          }

          // Step 4: Confirm upload completion
          const confirmResponse = await fetch("/api/images/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageId,
              postId: uploadPostId,
            }),
          });

          if (!confirmResponse.ok) {
            const error = await confirmResponse.json();
            return { success: false, error: error.error || "업로드 확인 실패" };
          }

          const image = await confirmResponse.json();
          return { success: true, image };
        } catch (error) {
          console.error("Image upload error:", error);
          return { success: false, error: "업로드 중 오류 발생" };
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
    } catch {
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

  const lastSaved = useMemo(() => {
    const now = new Date();
    return formatInTimeZone(now, "Asia/Seoul", "HH:mm");
  }, []);

  const statusParts = [
    publishedAt
      ? `발행됨 ${formatInTimeZone(publishedAt, "Asia/Seoul", "yyyy-MM-dd HH:mm")}`
      : "초안",
    emailSent && "이메일 발송됨",
    `${wordCount}단어`,
    readingTime > 0 && `${readingTime}분`,
    postId &&
      (lastAutosaved && publishedAt === null
        ? `자동저장 ${formatInTimeZone(lastAutosaved, "Asia/Seoul", "HH:mm")}`
        : `마지막 저장 ${lastSaved}`),
  ].filter(Boolean);

  return (
    <div className="space-y-2" aria-label="블로그 글 편집">
      <input
        type="text"
        className={`${inputClassName} p-2 min-w-full`}
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="글 제목"
      />

      <Tiptap
        ref={editorRef}
        name="content"
        content={content}
        className="p-2 prose dark:prose-invert max-w-none border border-blue-500 rounded-sm min-h-[50vh] focus:outline-none"
        onChange={(_name, html) => {
          setContent(html);
        }}
      />

      <div className="space-y-2">
        <div className="flex flex-row flex-wrap items-baseline gap-2">
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
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
          >
            {isUploadingImage ? "업로드 중..." : "이미지 업로드"}
          </Button>
          <span className="text-neutral-500 text-sm">
            여러 이미지를 선택할 수 있습니다.
          </span>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
      </div>

      <div className="flex flex-row flex-wrap gap-2 items-baseline">
        <Button disabled={isLoading} onClick={() => handleSavePost("save")}>
          저장
        </Button>
        {publishedAt === null ? (
          <Button
            disabled={isLoading}
            onClick={() => handleSavePost("publish")}
          >
            발행
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={async () => {
              const res = await unPublishPost(blogId, postId!);
              if (res.success) {
                setPublishedAt(null);
                toast("발행 취소 완료 ✅");
              }
            }}
          >
            발행 취소
          </Button>
        )}
        {publishedAt !== null && postId !== null && (
          <Button
            variant="outline"
            disabled={isEmailLoading || emailSent}
            onClick={handleSendEmail}
          >
            {emailSent ? "이메일 발송 완료" : "이메일 발송"}
          </Button>
        )}
        {postId !== null && (
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive">삭제</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>글 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  정말로 이 글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
        )}
      </div>

      <p className="text-neutral-500 text-sm">
        {statusParts.join(" · ")}
        {publishedAt === null && autosaveStatus !== "idle" && (
          <span
            className={`transition-opacity duration-300 ${
              showAutosaveStatus ? "opacity-100" : "opacity-0"
            } ${autosaveStatus === "error" ? "text-red-500" : ""}`}
          >
            {" · "}
            {autosaveStatus === "saving" && "자동저장 중..."}
            {autosaveStatus === "saved" && "자동저장됨"}
            {autosaveStatus === "error" && "자동저장 실패"}
          </span>
        )}
      </p>
    </div>
  );
}
