import React, { useRef, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "../index.css";

export default function RichTextEditor({ value = "", onChange, onImageUpload }) {
  const quillRef = useRef(null);

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      try {
        const imageUrl = await onImageUpload(file);
        if (!imageUrl) return;

        const editor = quillRef.current.getEditor();
        const range = editor.getSelection(true);
        editor.insertEmbed(range.index, "image", imageUrl);
        editor.setSelection(range.index + 1);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    };
  };

  // Memoize modules to prevent re-creation on every render
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
      ],
      handlers: {
        image: handleImageUpload,
      },
    },
  }), []); // empty deps: never recreate

  return (
    <ReactQuill
      ref={quillRef}
      theme="snow"
      value={value || ""}
      onChange={onChange}
      modules={modules}
      className="rich-editor bg-white border rounded text-black"
    />
  );
}
