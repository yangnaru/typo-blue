import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback } from "react";
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Unlink 
} from "lucide-react";

function Tiptap({
  name,
  content,
  className,
  onChange,
}: {
  name: string;
  content: string;
  className: string;
  onChange: (name: string, content: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    content: content,
    onUpdate: ({ editor }) => {
      onChange(name, editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: className,
      },
    },
    extensions: [
      StarterKit,
      Typography,
      Link,
      Placeholder.configure({
        placeholder: "내용",
      }),
    ],
  });

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();

      return;
    }

    // update link
    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 pl-1" role="toolbar" aria-label="텍스트 편집 도구">
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          aria-label="제목 1 적용"
          title="제목 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          aria-label="제목 2 적용"
          title="제목 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          aria-label="제목 3 적용"
          title="제목 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 hover:bg-accent rounded-md transition-colors ${
            editor.isActive("bold") 
              ? "text-foreground bg-accent" 
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="굵게 적용"
          title="굵게 (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 hover:bg-accent rounded-md transition-colors ${
            editor.isActive("italic") 
              ? "text-foreground bg-accent" 
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="기울임 적용"
          title="기울임 (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 hover:bg-accent rounded-md transition-colors ${
            editor.isActive("bulletList") 
              ? "text-foreground bg-accent" 
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="글머리 기호 목록 적용"
          title="글머리 기호 목록"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 hover:bg-accent rounded-md transition-colors ${
            editor.isActive("orderedList") 
              ? "text-foreground bg-accent" 
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="번호 목록 적용"
          title="번호 목록"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          onClick={setLink}
          className={`p-2 hover:bg-accent rounded-md transition-colors ${
            editor.isActive("link") 
              ? "text-foreground bg-accent" 
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="링크 추가"
          title="링크 추가/편집"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive("link")}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="링크 제거"
          title="링크 제거"
        >
          <Unlink className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export default Tiptap;
