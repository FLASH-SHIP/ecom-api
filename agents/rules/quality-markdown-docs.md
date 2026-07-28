# Markdown Documentation Formatting Rules (`quality-markdown-docs.md`)

When writing, creating, or editing Markdown (`.md`) documentation files across the workspace, follow these standard formatting rules to ensure 0 linter warnings:

## 1. Blank Lines Around Headings (MD022)

Always insert **1 blank line before AND after** any Markdown heading (`#`, `##`, `###`).

```markdown
<!-- Good -->
## 1. Section Title

This is the content paragraph under the heading.

<!-- Bad -->
## 1. Section Title
This is the content paragraph without a blank line above.
```

## 2. Blank Lines Around Fenced Code Blocks (MD031)

Always insert **1 blank line before AND after** a fenced code block.

- Example of good code block spacing:

  ```bash
  yarn build
  ```

- Ensure code blocks are separated from surrounding paragraphs by blank lines.

## 3. Blank Lines Around Lists (MD032) & Bullet Style (MD004)

Always insert **1 blank line before AND after** a bullet list, and consistently use `-` for unordered bullet items instead of mixing `*` and `-`.

```markdown
<!-- Good -->
Key features:

- Feature A
- Feature B
- Feature C

Next section...
```

## 4. No Trailing Punctuation in Headings (MD026)

Avoid trailing colons (`:`) or periods (`.`) in heading titles.

```markdown
<!-- Good -->
## 2. System Architecture Overview

<!-- Bad -->
## 2. System Architecture Overview:
```
