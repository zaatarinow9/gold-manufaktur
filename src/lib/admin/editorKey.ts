let editorKeyCounter = 0;

/** Unique React key for a freshly opened "create" editor. */
export function nextEditorKey(prefix = "new") {
  editorKeyCounter += 1;
  return `${prefix}-${editorKeyCounter}`;
}
