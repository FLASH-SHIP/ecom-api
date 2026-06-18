"use client";

import { Separator } from "@ecom/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ecom/ui/components/tooltip";
import { cn } from "@ecom/ui/lib/utils";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Maximize,
  Minimize,
  Minus,
  Quote,
  Redo,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  minHeight?: number;
}

function ToolbarButton({
  icon,
  tooltip,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  tooltip: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "flex size-8 items-center justify-center rounded transition-colors disabled:opacity-40",
              active
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ToolbarSeparator() {
  return <Separator orientation="vertical" className="mx-1 h-5" />;
}

const HEADING_OPTIONS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "1", label: "Heading 1" },
  { value: "2", label: "Heading 2" },
  { value: "3", label: "Heading 3" },
  { value: "4", label: "Heading 4" },
  { value: "5", label: "Heading 5" },
  { value: "6", label: "Heading 6" },
] as const;

const iconSize = "h-[18px] w-[18px]";

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  helperText,
  minHeight = 200,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      Superscript,
      Subscript,
      Image.configure({ inline: false, allowBase64: true }),
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (
      editor &&
      value !== editor.getHTML() &&
      value !== (editor.getHTML() === "<p></p>" ? "" : editor.getHTML())
    ) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  const handleSetLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const handleAddImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const handleHeadingChange = useCallback(
    (val: string) => {
      if (!editor) return;
      if (val === "paragraph") {
        editor.chain().focus().setParagraph().run();
      } else {
        const level = Number.parseInt(val, 10) as 1 | 2 | 3 | 4 | 5 | 6;
        editor.chain().focus().toggleHeading({ level }).run();
      }
    },
    [editor],
  );

  function getCurrentHeading(): string {
    if (!editor) return "paragraph";
    for (let i = 1; i <= 6; i++) {
      if (editor.isActive("heading", { level: i })) return String(i);
    }
    return "paragraph";
  }

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isFullscreen]);

  if (!editor) return null;

  const editorContent = (
    <div
      className={cn(
        "overflow-hidden border border-border",
        isFullscreen
          ? "flex flex-1 flex-col rounded-none"
          : "rounded-md focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
      )}
    >
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1">
        {/* Undo / Redo */}
        <ToolbarButton
          tooltip="Undo"
          icon={<Undo className={iconSize} strokeWidth={1.8} />}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          tooltip="Redo"
          icon={<Redo className={iconSize} strokeWidth={1.8} />}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />

        <ToolbarSeparator />

        {/* Heading dropdown */}
        <select
          value={getCurrentHeading()}
          onChange={(e) => handleHeadingChange(e.target.value)}
          className="h-8 min-w-[120px] rounded border-none bg-transparent px-2 text-[0.8125rem] outline-none focus:ring-1 focus:ring-primary"
        >
          {HEADING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Lists, Blockquote, Code Block */}
        <ToolbarButton
          tooltip="Bullet List"
          icon={<List className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          tooltip="Ordered List"
          icon={<ListOrdered className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          tooltip="Blockquote"
          icon={<Quote className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          tooltip="Code Block"
          icon={<Code className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />

        <ToolbarSeparator />

        {/* Text formatting */}
        <ToolbarButton
          tooltip="Bold"
          icon={<Bold className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          tooltip="Italic"
          icon={<Italic className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          tooltip="Strikethrough"
          icon={<Strikethrough className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarButton
          tooltip="Inline Code"
          icon={<Code className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <ToolbarButton
          tooltip="Underline"
          icon={<UnderlineIcon className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          tooltip="Highlight"
          icon={<Highlighter className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        />
        <ToolbarButton
          tooltip="Link"
          icon={<LinkIcon className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("link")}
          onClick={handleSetLink}
        />

        <ToolbarSeparator />

        {/* Superscript, Subscript */}
        <ToolbarButton
          tooltip="Superscript"
          icon={<SuperscriptIcon className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        />
        <ToolbarButton
          tooltip="Subscript"
          icon={<SubscriptIcon className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        />

        <ToolbarSeparator />

        {/* Alignment */}
        <ToolbarButton
          tooltip="Align Left"
          icon={<AlignLeft className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        />
        <ToolbarButton
          tooltip="Align Center"
          icon={<AlignCenter className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        />
        <ToolbarButton
          tooltip="Align Right"
          icon={<AlignRight className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        />
        <ToolbarButton
          tooltip="Align Justify"
          icon={<AlignJustify className={iconSize} strokeWidth={1.8} />}
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        />

        <ToolbarSeparator />

        {/* Image & Horizontal Rule */}
        <ToolbarButton
          tooltip="Add Image"
          icon={<ImageIcon className={iconSize} strokeWidth={1.8} />}
          onClick={handleAddImage}
        />
        <ToolbarButton
          tooltip="Horizontal Rule"
          icon={<Minus className={iconSize} strokeWidth={1.8} />}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />

        <div className="flex-1" />

        {/* Fullscreen */}
        <ToolbarButton
          tooltip={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          icon={
            isFullscreen ? (
              <Minimize className={iconSize} strokeWidth={1.8} />
            ) : (
              <Maximize className={iconSize} strokeWidth={1.8} />
            )
          }
          onClick={() => setIsFullscreen((prev) => !prev)}
        />
      </div>

      {/* ── Editor Content ── */}
      <div className={cn(isFullscreen && "flex-1 overflow-auto", "rte-content")}>
        <EditorContent editor={editor} />
      </div>

      {/* Scoped TipTap styles */}
      <style>{`
        .rte-content .tiptap {
          min-height: ${isFullscreen ? "100%" : `${minHeight}px`};
          padding: 12px 16px;
          outline: none;
          font-size: 0.875rem;
          line-height: 1.7;
        }
        .rte-content .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--muted-foreground, #9ca3af);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .rte-content .tiptap h1 { font-size: 1.75rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.375rem; }
        .rte-content .tiptap h2 { font-size: 1.5rem; font-weight: 700; margin-top: 0.875rem; margin-bottom: 0.25rem; }
        .rte-content .tiptap h3 { font-size: 1.25rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.25rem; }
        .rte-content .tiptap h4 { font-size: 1.1rem; font-weight: 600; margin-top: 0.625rem; margin-bottom: 0.25rem; }
        .rte-content .tiptap h5 { font-size: 1rem; font-weight: 600; margin-top: 0.5rem; margin-bottom: 0.25rem; }
        .rte-content .tiptap h6 { font-size: 0.875rem; font-weight: 600; margin-top: 0.5rem; margin-bottom: 0.25rem; }
        .rte-content .tiptap ul, .rte-content .tiptap ol { padding-left: 1.5rem; }
        .rte-content .tiptap blockquote {
          border-left: 3px solid var(--border);
          padding-left: 1rem;
          margin-left: 0;
          color: var(--muted-foreground);
          font-style: italic;
        }
        .rte-content .tiptap pre {
          background: var(--accent);
          border-radius: 0.375rem;
          padding: 0.75rem;
          font-family: monospace;
          font-size: 0.8125rem;
          overflow: auto;
        }
        .rte-content .tiptap mark { background: #fef08a; color: #854d0e; border-radius: 2px; padding: 0 2px; }
        .rte-content .tiptap a { color: hsl(var(--primary)); text-decoration: underline; }
        .rte-content .tiptap hr { border-color: var(--border); margin: 0.75rem 0; }
        .rte-content .tiptap img { max-width: 100%; height: auto; border-radius: 0.375rem; }
        .rte-content .tiptap sup { font-size: 0.75em; }
        .rte-content .tiptap sub { font-size: 0.75em; }
      `}</style>
    </div>
  );

  if (isFullscreen) {
    return (
      <>
        <div id={id} />
        {createPortal(
          <div className="fixed inset-0 z-fullscreen flex flex-col bg-background">
            {editorContent}
          </div>,
          document.body,
        )}
      </>
    );
  }

  return (
    <div id={id}>
      {editorContent}
      {helperText && <p className="ml-3 mt-1 text-sm text-muted-foreground">{helperText}</p>}
    </div>
  );
}
