import { describe, expect, it } from "bun:test";
import * as React from "react";
import { ProductFormDialog } from "./product-form-dialog";

function collectElements(node: React.ReactNode, elements: React.ReactElement[] = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => collectElements(child, elements));
  } else if (React.isValidElement(node)) {
    elements.push(node);
    collectElements((node.props as { children?: React.ReactNode }).children, elements);
  }
  return elements;
}

describe("ProductFormDialog image upload", () => {
  it("shows an image picker, supported file hint, and upload preview controls", () => {
    const tree = ProductFormDialog({
      state: {
        open: true,
        product: null,
        name: "",
        price: undefined,
        originalPrice: "",
        stock: undefined,
        category: "",
        species: "BOTH",
        description: "",
        imageUrl: "https://example.test/product.png",
        imagePreviewUrl: "blob:local-product-preview",
        isUploadingImage: true,
        isSaving: false,
      },
      actions: {
        onOpenChange: () => {},
        setName: () => {},
        setPrice: () => {},
        setOriginalPrice: () => {},
        setStock: () => {},
        setCategory: () => {},
        setSpecies: () => {},
        setDescription: () => {},
        onSelectImage: () => {},
        onRemoveImage: () => {},
        onSubmit: () => {},
      },
    });
    const elements = collectElements(tree);
    const imagePicker = elements.find((element) => element.props.id === "product-image");
    const previewText = elements.find((element) => element.props.children === "Đang tải ảnh lên; đây là ảnh xem trước.");
    const previewImage = elements.find((element) => element.props.alt === "Ảnh sản phẩm xem trước");
    const removeImageButton = elements.find((element) => element.props.children === "Gỡ ảnh");

    expect(imagePicker).toBeDefined();
    expect(imagePicker?.props.type).toBe("file");
    expect(imagePicker?.props.accept).toBe("image/*");
    expect(previewText).toBeDefined();
    expect(previewImage?.props.src).toBe("blob:local-product-preview");
    expect(removeImageButton).toBeDefined();
  });

  it("passes the selected image to the upload action and clears the picker", () => {
    const file = new File(["image"], "pet.png", { type: "image/png" });
    let selectedFile: File | null | undefined;
    const tree = ProductFormDialog({
      state: {
        open: true,
        product: null,
        name: "",
        price: undefined,
        originalPrice: "",
        stock: undefined,
        category: "",
        species: "BOTH",
        description: "",
        imageUrl: "",
        imagePreviewUrl: "",
        isUploadingImage: false,
        isSaving: false,
      },
      actions: {
        onOpenChange: () => {},
        setName: () => {},
        setPrice: () => {},
        setOriginalPrice: () => {},
        setStock: () => {},
        setCategory: () => {},
        setSpecies: () => {},
        setDescription: () => {},
        onSelectImage: (value) => {
          selectedFile = value;
        },
        onRemoveImage: () => {},
        onSubmit: () => {},
      },
    });
    const imagePicker = collectElements(tree).find((element) => element.props.id === "product-image");
    const inputElement = { files: [file], value: "pet.png" };

    expect(imagePicker).toBeDefined();
    (imagePicker?.props.onChange as (event: React.ChangeEvent<HTMLInputElement>) => void)({
      currentTarget: inputElement,
    } as React.ChangeEvent<HTMLInputElement>);

    expect(selectedFile).toBe(file);
    expect(inputElement.value).toBe("");
  });
});
