import { Mark, mergeAttributes } from "@tiptap/core";

export const Underline = Mark.create({
  name: "underline",
  addOptions() {
    return { HTMLAttributes: {} };
  },
  parseHTML() {
    return [
      { tag: "u" },
      {
        style: "text-decoration",
        consuming: false,
        getAttrs: (style) => (typeof style === "string" && style.includes("underline") ? {} : false),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["u", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setUnderline: () => ({ commands }) => commands.setMark(this.name),
      toggleUnderline: () => ({ commands }) => commands.toggleMark(this.name),
      unsetUnderline: () => ({ commands }) => commands.unsetMark(this.name),
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-u": () => this.editor.commands.toggleUnderline(),
      "Mod-U": () => this.editor.commands.toggleUnderline(),
    };
  },
});
