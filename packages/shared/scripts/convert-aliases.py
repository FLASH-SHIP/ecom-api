#!/usr/bin/env python3
"""
Convert absolute aliases (src/, @/, @fuse/, @i18n/, @auth/, @configs/) 
in fuse-shared source files to relative paths.
Handles both static imports and dynamic import() expressions.
"""
import os
import re
import sys

FUSE_SHARED_SRC = "/Users/tuandang/Data/Ecom/ecom/packages/fuse-shared/src"

ALIAS_MAP = {
    "src/": FUSE_SHARED_SRC + "/",
    "@/": FUSE_SHARED_SRC + "/",
    "@fuse/": FUSE_SHARED_SRC + "/@fuse/",
    "@i18n/": FUSE_SHARED_SRC + "/@i18n/",
    "@auth/": FUSE_SHARED_SRC + "/@auth/",
    "@configs/": FUSE_SHARED_SRC + "/configs/",
    # Bare alias (no trailing slash) - exact match e.g. import x from '@i18n'
    "@i18n": FUSE_SHARED_SRC + "/@i18n/index",
    "@fuse": FUSE_SHARED_SRC + "/@fuse/index",
    "@auth": FUSE_SHARED_SRC + "/@auth/index",
}

# Static import/export patterns
STATIC_IMPORT_RE = re.compile(
    r"""((?:import|export)\s+.*?from\s+['""])(src/|@/|@fuse/|@i18n/|@auth/|@configs/|@i18n|@fuse|@auth)([^'""]*)(['""])""",
    re.DOTALL
)

# Dynamic import() pattern
DYNAMIC_IMPORT_RE = re.compile(
    r"""(import\s*\(\s*['""])(src/|@/|@fuse/|@i18n/|@auth/|@configs/|@i18n|@fuse|@auth)([^'""]*)(['""])""",
)

def resolve_alias(alias_prefix, subpath, file_path):
    """Resolve an aliased import to a relative path from file_path."""
    target = ALIAS_MAP.get(alias_prefix)
    if target is None:
        return None
    
    if alias_prefix.endswith("/"):
        # prefix alias: target is a directory
        abs_target = os.path.normpath(target + subpath)
    else:
        # bare alias: target includes the filename
        abs_target = os.path.normpath(target)
        # subpath would be empty
    
    file_dir = os.path.dirname(file_path)
    rel_path = os.path.relpath(abs_target, file_dir)
    if not rel_path.startswith("."):
        rel_path = "./" + rel_path
    return rel_path

def make_replacer(file_path):
    def replace_match(m):
        prefix = m.group(1)    # "import X from '"
        alias = m.group(2)     # "src/" or "@i18n"
        subpath = m.group(3)   # rest of path (empty for bare aliases)
        quote = m.group(4)     # closing quote
        rel = resolve_alias(alias, subpath, file_path)
        if rel is None:
            return m.group(0)
        return f"{prefix}{rel}{quote}"
    return replace_match

def process_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    replacer = make_replacer(file_path)
    
    content = STATIC_IMPORT_RE.sub(replacer, content)
    content = DYNAMIC_IMPORT_RE.sub(replacer, content)
    
    if content != original:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"UPDATED: {os.path.relpath(file_path, FUSE_SHARED_SRC)}")
        return True
    return False

def main():
    count = 0
    for root, dirs, files in os.walk(FUSE_SHARED_SRC):
        dirs[:] = [d for d in dirs if d != "node_modules"]
        for fname in files:
            if fname.endswith((".tsx", ".ts")):
                fpath = os.path.join(root, fname)
                if process_file(fpath):
                    count += 1
    print(f"\nDone: {count} files updated.")

if __name__ == "__main__":
    main()
