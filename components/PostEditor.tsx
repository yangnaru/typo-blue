"use client";

import { useState, useMemo } from "react";
import Tiptap from "./Tiptap";
import format from "date-fns/format";
import formatInTimeZone from "date-fns-tz/formatInTimeZone";
import {
  deletePost,
  unPublishPost,
  upsertPost,
  sendPostEmail,
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

  async function handleSavePost(status: "save" | "publish" = "save") {
    setIsLoading(true);

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
    const res = await deletePost(blogId, existingPostId!);

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
    const cleanContent = content.replace(/<[^>]*>/g, "").trim();
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

  return (
    <div className="max-w-prose mx-auto space-y-8" role="main" aria-label="블로그 글 편집">
      {/* Header with navigation and status */}
      <div className="flex items-center justify-between pb-4" role="region" aria-label="글 상태 및 네비게이션">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(getBlogPostsPath(blogId))}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />글 목록으로
          </Button>
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {postId && (
            <>
              <Clock className="h-4 w-4" />
              마지막 저장: {lastSaved}
            </>
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
              name="content"
              content={content}
              className="prose dark:prose-invert max-w-none min-h-[70vh] focus:outline-none border-0 shadow-none p-0 bg-transparent"
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
