"use client";

import * as React from "react";

export function useImageUploadPreview() {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const objectUrlRef = React.useRef<string | null>(null);

  const clearPreview = React.useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const previewFile = React.useCallback(
    (file: File) => {
      clearPreview();
      const nextPreviewUrl = URL.createObjectURL(file);
      objectUrlRef.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);
    },
    [clearPreview],
  );

  React.useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    },
    [],
  );

  return { previewUrl, previewFile, clearPreview };
}
