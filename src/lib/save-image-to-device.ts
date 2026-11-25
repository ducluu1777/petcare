export async function saveImageToDevice(imageUrl: string, filename: string) {
  const response = await fetch(imageUrl, { mode: "cors" });
  if (!response.ok) throw new Error("Không thể tải ảnh mã QR.");

  const blob = await response.blob();
  if (!blob.size) throw new Error("Ảnh mã QR đang trống.");

  const file = new File([blob], filename, { type: blob.type || "image/png" });
  const shareNavigator = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (shareNavigator.share && shareNavigator.canShare?.({ files: [file] })) {
    await shareNavigator.share({ files: [file], title: "Mã QR thanh toán PetCare" });
    return "shared" as const;
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return "downloaded" as const;
}
