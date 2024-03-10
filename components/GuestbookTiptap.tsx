import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import "remixicon/fonts/remixicon.css";

export default function GuestbookTiptap({
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
      Document,
      Paragraph,
      Text,
      Placeholder.configure({
        placeholder: "내용",
      }),
    ],
  });

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
}
