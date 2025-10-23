"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ImageData {
  id: string;
  url: string;
  width: number;
  height: number;
  filename: string;
}

interface ImageThumbnailProps {
  image: ImageData;
  onDelete: (imageId: string) => Promise<void>;
  onClick: () => void;
}

export function ImageThumbnail({
  image,
  onDelete,
  onClick,
}: ImageThumbnailProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(image.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete image:", error);
      alert("이미지 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="group relative border rounded-lg overflow-hidden bg-muted hover:bg-accent transition-colors">
        <button
          onClick={onClick}
          className="w-full h-full flex flex-col items-center gap-2 p-3 cursor-pointer"
          title={`${image.filename} 삽입`}
        >
          <div className="relative w-full h-32">
            <Image
              src={image.url}
              alt={image.filename}
              fill
              className="object-cover rounded"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          </div>
          <span className="text-xs text-muted-foreground truncate w-full text-center">
            {image.filename}
          </span>
          <span className="text-xs text-muted-foreground">
            {image.width} × {image.height}
          </span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteDialog(true);
          }}
          className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
          title="이미지 삭제"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이미지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 이미지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "삭제"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
