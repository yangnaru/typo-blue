"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Tiptap, { TiptapRef } from "./Tiptap";
import { ImageThumbnail, ImageData } from "./ImageThumbnail";
import { formatInTimeZone } from "date-fns-tz";
import {
  deletePost,
  unPublishPost,
  upsertPost,
  sendPostEmail,
  autosaveDraftPost,
} from "@/lib/actions/blog";
import { PlainButton, plainButtonClassName } from "@/components/plain-button";
import { Pill, PillItem } from "@/components/pill";
import { getBlogPostsPath, getBlogPostEditPath } from "@/lib/paths";
import { toast } from "sonner";
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
  existingUpdated = null,
  existingEmailSent = false,
}: {
  blogId: string;
  existingPostId?: string | null;
  existingTitle?: string;
  existingContent?: string;
  existingPublishedAt?: Date | null;
  existingUpdated?: Date | null;
  existingEmailSent?: boolean;
}) {
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

  // Saving
  const [savedAt, setSavedAt] = useState<Date | null>(existingUpdated);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "saving" | "saved" | "error" | null
  >(null);
  const [showAutosaveStatus, setShowAutosaveStatus] = useState(false);
  // What the server has, and what the editor has, for saves that run later
  const savedRef = useRef({ title: existingTitle, content: existingContent });
  const latestRef = useRef({ title, content, publishedAt });
  const postIdRef = useRef(existingPostId);
  // Saves run one at a time, so a new post is only ever created once
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  // Set once the post is deleted, so no save queued behind it writes it back
  const deletedRef = useRef(false);

  useEffect(() => {
    latestRef.current = { title, content, publishedAt };
  }, [title, content, publishedAt]);

  function enqueueSave<T>(task: () => Promise<T>): Promise<T> {
    const result = saveQueueRef.current.then(task, task);
    saveQueueRef.current = result.catch(() => {});
    return result;
  }

  function markSaved(savedPostId: string, title: string, content: string) {
    if (!postIdRef.current) {
      // Point the URL at the new post without remounting the editor, so a
      // reload finds it
      window.history.replaceState(
        null,
        "",
        getBlogPostEditPath(blogId, savedPostId)
      );
    }
    postIdRef.current = savedPostId;
    setPostId(savedPostId);
    savedRef.current = { title, content };
    setSavedAt(new Date());
  }

  // Images need a post to belong to, so this saves the draft even when empty
  function ensurePostId() {
    return enqueueSave(async () => {
      if (postIdRef.current) return postIdRef.current;
      const { title, content } = latestRef.current;
      const res = await autosaveDraftPost(blogId, null, title, content);
      markSaved(res.postId, title, content);
      return res.postId;
    });
  }

  function autosave() {
    return enqueueSave(async () => {
      const { title, content, publishedAt } = latestRef.current;
      if (deletedRef.current || publishedAt !== null) return;
      if (!title.trim() && !content.trim()) return;
      if (
        title === savedRef.current.title &&
        content === savedRef.current.content
      ) {
        return;
      }

      setAutosaveStatus("saving");
      setShowAutosaveStatus(true);
      try {
        const res = await autosaveDraftPost(
          blogId,
          postIdRef.current,
          title,
          content
        );
        markSaved(res.postId, title, content);
        setAutosaveStatus("saved");
      } catch (error) {
        console.error("Autosave failed:", error);
        setAutosaveStatus("error");
      }
    });
  }

  // Autosave drafts 2 seconds after the last edit
  useEffect(() => {
    if (publishedAt !== null) return;
    const timeout = setTimeout(autosave, 2000);
    return () => clearTimeout(timeout);
  }, [title, content, publishedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fade the autosave status out a while after it settles
  useEffect(() => {
    if (autosaveStatus !== "saved" && autosaveStatus !== "error") return;
    const timeout = setTimeout(
      () => setShowAutosaveStatus(false),
      autosaveStatus === "saved" ? 2000 : 4000
    );
    return () => clearTimeout(timeout);
  }, [autosaveStatus]);

  // Warn before leaving with unsaved changes; published posts aren't
  // autosaved, so this is all that stops their edits being lost
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { title, content } = latestRef.current;
      if (
        !deletedRef.current &&
        (title.trim() || content.trim()) &&
        (title !== savedRef.current.title ||
          content !== savedRef.current.content)
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

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
      let uploadPostId: string;
      try {
        uploadPostId = await ensurePostId();
      } catch (error) {
        console.error("Failed to save the post before uploading:", error);
        toast.error("글 저장에 실패했습니다.");
        return;
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

  async function handleSavePost(status: "save" | "publish" = "save") {
    setIsLoading(true);
    const publishedAtValue = status === "publish" ? new Date() : publishedAt;

    try {
      // After any autosave in flight, so both don't create a post
      await enqueueSave(async () => {
        const res = await upsertPost(
          blogId,
          publishedAtValue,
          postIdRef.current,
          title,
          content
        );
        markSaved(res.postId, title, content);
      });

      setPublishedAt(publishedAtValue);
      setAutosaveStatus(null);
      setShowAutosaveStatus(false);

      toast(
        formatInTimeZone(new Date(), "Asia/Seoul", "yyyy년 MM월 dd일 HH시 mm분") +
          ` ${status === "save" ? "저장" : "발행"} 완료 ✅`
      );
    } catch (error) {
      console.error("Save failed:", error);
      toast("❗️");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    setIsLoading(true);
    try {
      // After any save in flight, and before any queued behind it
      await enqueueSave(async () => {
        await deletePost(blogId, postIdRef.current!);
        deletedRef.current = true;
      });
      toast.success("삭제되었습니다.");
      window.location.href = getBlogPostsPath(blogId);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("삭제에 실패했습니다.");
      setIsLoading(false);
      setDeleteDialogOpen(false);
    }
  }

  async function handleUnpublish() {
    setIsLoading(true);
    try {
      await enqueueSave(() => unPublishPost(blogId, postIdRef.current!));
      setPublishedAt(null);
      toast("발행 취소 완료 ✅");
    } catch (error) {
      console.error("Unpublish failed:", error);
      toast("❗️");
    } finally {
      setIsLoading(false);
    }
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

  const statusParts = [
    publishedAt
      ? `발행됨 ${formatInTimeZone(publishedAt, "Asia/Seoul", "yyyy-MM-dd HH:mm")}`
      : "초안",
    emailSent && "이메일 발송됨",
    `${wordCount}단어`,
    readingTime > 0 && `${readingTime}분`,
    postId &&
      savedAt &&
      `마지막 저장 ${formatInTimeZone(savedAt, "Asia/Seoul", "HH:mm")}`,
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
          <PlainButton
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
          >
            {isUploadingImage ? "업로드 중..." : "이미지 업로드"}
          </PlainButton>
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
        <Pill aria-label="글 작업">
          <PillItem disabled={isLoading} onClick={() => handleSavePost("save")}>
            저장
          </PillItem>
          {publishedAt === null ? (
            <PillItem
              disabled={isLoading}
              onClick={() => handleSavePost("publish")}
            >
              발행
            </PillItem>
          ) : (
            <PillItem disabled={isLoading} onClick={handleUnpublish}>
              발행 취소
            </PillItem>
          )}
          {publishedAt !== null && postId !== null && (
            <PillItem
              disabled={isEmailLoading || emailSent}
              onClick={handleSendEmail}
            >
              {emailSent ? "이메일 발송 완료" : "이메일 발송"}
            </PillItem>
          )}
        </Pill>
        {postId !== null && (
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <PlainButton variant="destructive">삭제</PlainButton>
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
                  disabled={isLoading}
                  onClick={(e) => {
                    // Stay open until the deletion finishes
                    e.preventDefault();
                    handleDelete();
                  }}
                  className={plainButtonClassName("destructive")}
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
        {publishedAt === null && autosaveStatus && (
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
