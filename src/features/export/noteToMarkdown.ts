import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import Underline from "@tiptap/extension-underline";

let sharedEditor: Editor | null = null;

function getEditor(): Editor {
  if (!sharedEditor) {
    sharedEditor = new Editor({
      extensions: [
        StarterKit,
        Underline,
        Link.configure({ openOnClick: false }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Image.configure({ inline: false, allowBase64: true }),
        Markdown.configure({ html: false, tightLists: true }),
      ],
      content: { type: "doc", content: [] },
      editable: false,
    });
  }
  return sharedEditor;
}

export function noteContentToMarkdown(content: Record<string, unknown>): string {
  const editor = getEditor();
  editor.commands.setContent(content);
  const md = (editor.storage.markdown as { getMarkdown: () => string }).getMarkdown();
  return md || "";
}
