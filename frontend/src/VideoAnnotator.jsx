import React, { useRef, useState, useEffect } from "react";


export default function VideoAnnotator() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [annotations, setAnnotations] = useState([]); // persisted boxes
  const [currentBox, setCurrentBox] = useState(null); // box being drawn
  const [isDrawing, setIsDrawing] = useState(false);
  const [videoFileUrl, setVideoFileUrl] = useState(null);
  const [videoId, setVideoId] = useState(null); // id from backend (optional)
  const [fps, setFps] = useState(30);

  // helper: sync canvas size to video display size
  const syncCanvas = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.left = `${rect.left}px`;
    canvas.style.top = `${rect.top}px`;
    drawAll();
  };

  useEffect(() => {
    window.addEventListener("resize", syncCanvas);
    return () => window.removeEventListener("resize", syncCanvas);
  }, []);

  useEffect(() => {
    syncCanvas();
  }, [videoFileUrl, annotations]);

  // Draw boxes on canvas
  const drawAll = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved annotations
    annotations.forEach((a) => {
      drawBox(ctx, a, false);
    });
    // Draw current drawing box
    if (currentBox) {
      drawBox(ctx, currentBox, true);
    }
  };

  const drawBox = (ctx, box, isTemp) => {
    ctx.lineWidth = isTemp ? 2 : 2;
    ctx.setLineDash(isTemp ? [6] : []);
    ctx.strokeStyle = isTemp ? "red" : "lime";
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    if (!isTemp && box.label) {
      ctx.font = "14px Arial";
      ctx.fillStyle = "lime";
      ctx.fillText(box.label, box.x + 4, box.y + 14);
    }
  };

  // Convert page coords -> canvas coords
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e) => {
    if (!videoRef.current) return;
    setIsDrawing(true);
    const pos = getCanvasCoords(e);
    setCurrentBox({ x: pos.x, y: pos.y, width: 0, height: 0, label: "object" });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentBox) return;
    const pos = getCanvasCoords(e);
    const newBox = {
      ...currentBox,
      width: pos.x - currentBox.x,
      height: pos.y - currentBox.y,
    };
    setCurrentBox(newBox);
    drawAll(); // immediate visual feedback
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || !currentBox) return;
    setIsDrawing(false);

    // Normalize width/height to positive values and adjust x/y if needed
    let { x, y, width, height } = currentBox;
    if (width < 0) {
      x = x + width;
      width = Math.abs(width);
    }
    if (height < 0) {
      y = y + height;
      height = Math.abs(height);
    }

    // Convert canvas coords back to video-relative coordinates ratio (0..1)
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const scaleX = video.videoWidth / canvas.width || 1;
    const scaleY = video.videoHeight / canvas.height || 1;

    // Store both display coords (for drawing) and video-space coords (for backend)
    const displayBox = { x, y, width, height, label: currentBox.label };

    // convert to video pixel coords
    const videoBox = {
      x: x * scaleX,
      y: y * scaleY,
      width: width * scaleX,
      height: height * scaleY,
    };

    // frame calculation using currentTime and fps
    const currentFrame = Math.floor(video.currentTime * fps);

    const newAnn = {
      frame: currentFrame,
      x: videoBox.x,
      y: videoBox.y,
      width: videoBox.width,
      height: videoBox.height,
      label: currentBox.label,
      // keep display coords so we can draw easily
      display: displayBox,
    };

    setAnnotations((prev) => [...prev, newAnn]);
    setCurrentBox(null);
    drawAll();
  };

  // Save annotations to backend
  const saveAnnotations = async () => {
    if (!videoId) {
      alert("Register the video first (or set video_id).");
      return;
    }
    // Prepare payload: strip display fields
    const payload = {
      video_id: videoId,
      fps,
      annotations: annotations.map((a) => ({
        frame: a.frame,
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        label: a.label,
      })),
    };

    const res = await fetch(`${API_BASE}/annotations/save/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    alert(`Saved ${data.count} annotations`);
  };

  // Load annotations for a given video id
  const loadAnnotationsFromServer = async (vid) => {
    setAnnotations([]);
    setVideoId(vid);
    const res = await fetch(`${API_BASE}/annotations/${vid}`);
    const arr = await res.json();

    // Need to convert video-space coords to display coords
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      // store raw, will transform on next sync
      setAnnotations(
        arr.map((a) => ({
          ...a,
          display: { x: a.x, y: a.y, width: a.width, height: a.height },
        }))
      );
      return;
    }

    // ensure metadata available (videoWidth/videoHeight)
    const scaleX = canvas.width / (video.videoWidth || canvas.width);
    const scaleY = canvas.height / (video.videoHeight || canvas.height);

    const converted = arr.map((a) => ({
      ...a,
      display: {
        x: a.x * scaleX,
        y: a.y * scaleY,
        width: a.width * scaleX,
        height: a.height * scaleY,
      },
    }));
    setAnnotations(converted);
    drawAll();
  };

  // handle file selection locally and optionally register video to backend
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (videoFileUrl) URL.revokeObjectURL(videoFileUrl);
    const url = URL.createObjectURL(file);
    setVideoFileUrl(url);

    // Optionally register the file metadata to backend to get video_id
    // we'll use filename; backend creates a Video record and returns id
    const payload = { filename: file.name };
    const res = await fetch(`${API_BASE}/videos/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setVideoId(data.id);
    alert(`Video registered with id ${data.id}`);
  };

  // When video metadata is ready (videoWidth/videoHeight), sync canvas and convert existing annotations
  const handleLoadedMetadata = () => {
    syncCanvas();
    // If annotations exist from server (video-space coords), convert them to display coords
    setAnnotations((prev) =>
      prev.map((a) => {
        if (!a.x || typeof a.display !== "undefined") return a; // already converted
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const scaleX = canvas.width / (video.videoWidth || canvas.width);
        const scaleY = canvas.height / (video.videoHeight || canvas.height);
        return {
          ...a,
          display: {
            x: a.x * scaleX,
            y: a.y * scaleY,
            width: a.width * scaleX,
            height: a.height * scaleY,
          },
        };
      })
    );
    drawAll();
  };

  return (
    <div ref={containerRef} style={{ position: "relative", maxWidth: 800 }}>
      <div style={{ marginBottom: 8 }}>
        <input type="file" accept="video/*" onChange={handleFileChange} />
        <button onClick={saveAnnotations} style={{ marginLeft: 8 }}>
          Save Annotations
        </button>
      </div>

      <div style={{ position: "relative" }}>
        <video
          ref={videoRef}
          src={videoFileUrl}
          width={800}
          controls
          onLoadedMetadata={handleLoadedMetadata}
          style={{ display: "block", maxWidth: "100%" }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            cursor: "crosshair",
            pointerEvents: "auto",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Annotations: </strong> {annotations.length}
        <ul>
          {annotations.map((a, i) => (
            <li key={i}>
              frame {a.frame} — {a.label} — [{Math.round(a.x)},{Math.round(a.y)}] {Math.round(a.width)}x{Math.round(a.height)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}