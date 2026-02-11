import { useState } from "react";
import type { Editor } from "@tiptap/core";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { Bold, Italic, Strikethrough, Underline as UnderlineIcon, ListChecks, List, ListOrdered, Heading1, Heading2, Heading3, Quote, Code, Braces, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/strings/t";

type EditorToolbarProps = {
  editor: Editor | null;
};

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor) return null;

  const currentHref = editor.getAttributes("link").href ?? "";

  const openLinkModal = () => {
    setLinkUrl(currentHref);
    setLinkOpen(true);
  };

  const applyLink = () => {
    if (linkUrl.trim()) {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkOpen(false);
  };

  return (
    <div className="flex items-center gap-0.5 rounded-[var(--radius-chip)] border border-transparent p-0.5">
      <Tooltip content="Bold (Ctrl+B)">
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("bold") && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.italic")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("italic") && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={18} />
        </Button>
      </Tooltip>
      <Tooltip content="Underline (Ctrl+U)">
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("underline") && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => {
            try {
              editor.chain().focus().toggleUnderline().run();
            } catch {}
          }}
        >
          <UnderlineIcon size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.strikethrough")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("strike") && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.heading1")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("heading", { level: 1 }) && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.heading2")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("heading", { level: 2 }) && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.heading3")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("heading", { level: 3 }) && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.quote")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("blockquote") && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.code")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("code") && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.codeBlock")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("codeBlock") && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Braces size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.link")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("link") && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={openLinkModal}
        >
          <LinkIcon size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.bulletList")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("bulletList") && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.orderedList")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 text-[var(--text-secondary)] hover:text-[var(--text)]",
            editor.isActive("orderedList") && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={18} />
        </Button>
      </Tooltip>
      <Tooltip content={t("editorToolbar.checklist")}>
        <Button
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 p-0 rounded-[10px] text-[var(--text-secondary)] hover:text-[var(--text)]",
            "border border-transparent backdrop-blur-md transition-all duration-150",
            "hover:bg-[var(--surface)]/60 hover:border-[var(--surface-border)]/50",
            editor.isActive("taskList") &&
              "bg-[var(--surface)]/70 text-[var(--text)] border-[var(--surface-border)]/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          )}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListChecks size={18} />
        </Button>
      </Tooltip>
      {linkOpen && (
        <span className="ml-1 flex items-center gap-1 rounded-[var(--radius-chip)] border border-[var(--surface-border)] bg-[var(--surface)] px-2 py-1">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyLink()}
            placeholder={t("editorToolbar.linkPlaceholder")}
            className="w-40 rounded border-0 bg-transparent px-1 py-0.5 text-sm text-[var(--text)] focus:outline-none"
            autoFocus
          />
          <Button variant="ghost" className="h-6 px-1.5 text-xs" onClick={applyLink}>
            {t("editorToolbar.apply")}
          </Button>
          <Button variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => setLinkOpen(false)}>
            {t("dialogs.cancel")}
          </Button>
        </span>
      )}
    </div>
  );
}
