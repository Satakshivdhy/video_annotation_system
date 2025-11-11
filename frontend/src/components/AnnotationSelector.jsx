import React, { useState } from "react";

export default function AnnotationSelector({ onSelect }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (tool) => {
    onSelect(tool);
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      {/* Choose Button */}
      <button
        onClick={() => setOpen(!open)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
      >
        Choose
      </button>

      {/* Modal Box */}
      {open && (
        <div className="absolute z-10 mt-2 w-60 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2 text-gray-700">Select Annotation Type:</p>

          <button
            onClick={() => handleSelect("bounding-box")}
            className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
          >
            🟦 BBox
          </button>

          <button
            onClick={() => handleSelect("polygon")}
            className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
          >
            🔺 Polygon
          </button>

          <button
            onClick={() => handleSelect("cuboid")}
            className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
          >
            🧊 Cuboid
          </button>
        </div>
      )}
    </div>
  );
}
