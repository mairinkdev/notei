import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Content } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import type { NoteKind, NoteAttachment } from "./types";
import { saveAttachment } from "@/features/attachments/attachmentService";
import { isTauri } from "@/lib/tauri";
import { EditorToolbar } from "./EditorToolbar";

type JSONNode = { type?: string; text?: string; content?: JSONNode[]; attrs?: Record<string, unknown> };

function getPlainText(doc: Content | JSONNode | JSONNode[]): string {
  if (typeof doc === "string") return doc;
  if (Array.isArray(doc)) return doc.map(getPlainText).join(" ");
  if (!doc || typeof doc !== "object") return "";
  const content = "content" in doc ? doc.content : undefined;
  if (!content || !Array.isArray(content)) {
    return "text" in doc && typeof doc.text === "string" ? doc.text : "";
  }
  const parts: string[] = [];
  for (const node of content) {
    if (node && typeof node === "object" && "type" in node && node.type === "text") {
      parts.push("text" in node && typeof node.text === "string" ? node.text : "");
    } else if (node && typeof node === "object") {
      parts.push(getPlainText(node as JSONNode));
    }
  }
  return parts.join(" ");
}

function getImageFiles(event: ClipboardEvent | DragEvent): File[] {
  const items = "clipboardData" in event ? event.clipboardData?.items : null;
  if (items) {
    return Array.from(items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f != null);
  }
  const files = "dataTransfer" in event ? event.dataTransfer?.files : null;
  if (files) {
    return Array.from(files).filter((f) => f.type.startsWith("image/"));
  }
  return [];
}

type NoteEditorProps = {
  noteId: string;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>, plainText: string) => void;
  onAttachmentAdded?: (attachment: NoteAttachment) => void;
  kind: NoteKind;
};

export function NoteEditor({ noteId, content, onChange, onAttachmentAdded, kind }: NoteEditorProps) {
  const onAttachmentAddedRef = useRef(onAttachmentAdded);
  const editorRef = useRef<Editor | null>(null);
  onAttachmentAddedRef.current = onAttachmentAdded;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder:
          kind === "meeting"
            ? "Agenda, notes, decisions, action items..."
            : "Write your note...",
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({ openOnClick: false }),
    ],
    content: content as Content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[200px] focus:outline-none",
      },
      handleKeyDown(_view, event) {
        if ((event.ctrlKey || event.metaKey) && event.key === "u") {
          event.preventDefault();
        }
        return false;
      },
      handlePaste(_view, event) {
        const files = getImageFiles(event);
        if (files.length === 0) return false;
        event.preventDefault();
        const ed = editorRef.current;
        if (!ed) return true;
        if (isTauri()) {
          (async () => {
            for (const file of files) {
              const result = await saveAttachment(noteId, file);
              if (result) {
                ed.chain().focus().setImage({ src: result.assetUrl }).run();
                onAttachmentAddedRef.current?.(result.attachment);
              }
            }
          })();
        } else {
          const file = files[0];
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            ed.chain().focus().setImage({ src: dataUrl }).run();
          };
          reader.readAsDataURL(file);
        }
        return true;
      },
      handleDrop(_view, event) {
        const files = getImageFiles(event);
        if (files.length === 0) return false;
        event.preventDefault();
        const ed = editorRef.current;
        if (!ed) return true;
        if (isTauri()) {
          (async () => {
            for (const file of files) {
              const result = await saveAttachment(noteId, file);
              if (result) {
                ed.chain().focus().setImage({ src: result.assetUrl }).run();
                onAttachmentAddedRef.current?.(result.attachment);
              }
            }
          })();
        } else {
          const file = files[0];
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            ed.chain().focus().setImage({ src: dataUrl }).run();
          };
          reader.readAsDataURL(file);
        }
        return true;
      },
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      try {
        const json = editor.getJSON();
        const plain = getPlainText(json as JSONNode);
        onChange(json as Record<string, unknown>, plain);
      } catch {}
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, onChange]);

  return (
    <div className="flex flex-col gap-1">
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:text-[var(--text)]"
      />
    </div>
  );
}
