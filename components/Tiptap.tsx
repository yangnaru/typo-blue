import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback } from "react";
import "remixicon/fonts/remixicon.css";

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
    <div className="flex flex-col gap-2">
      <div className="*:text-xl space-x-1 pl-1">
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className="ri-h-1 text-muted-foreground hover:text-foreground"
        ></button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className="ri-h-2 text-muted-foreground hover:text-foreground"
        ></button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className="ri-h-3 text-muted-foreground hover:text-foreground"
        ></button>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="ri-bold text-muted-foreground hover:text-foreground"
        ></button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="ri-italic text-muted-foreground hover:text-foreground"
        ></button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="ri-list-unordered text-muted-foreground hover:text-foreground"
        ></button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="ri-list-ordered text-muted-foreground hover:text-foreground"
        ></button>
        <button
          onClick={setLink}
          className={
            editor.isActive("link")
              ? "is-active ri-link text-muted-foreground hover:text-foreground"
              : "ri-link text-muted-foreground hover:text-foreground"
          }
        ></button>
        <button
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive("link")}
          className="ri-link-unlink text-muted-foreground hover:text-foreground"
        ></button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export default Tiptap;
