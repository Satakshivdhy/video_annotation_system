import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // States
  const [annotations, setAnnotations] = useState([]);
  const [currentBox, setCurrentBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [videoFileUrl, setVideoFileUrl] = useState(null);
  const [selectedTool, setSelectedTool] = useState("select");
  const [labels, setLabels] = useState(["car", "person", "tree"]);
  const [activeLabel, setActiveLabel] = useState("car");
  const [newLabel, setNewLabel] = useState("");

  // =============================
  // SYNC CANVAS
  // =============================
  const syncCanvas = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  };

  useEffect(() => {
    window.addEventListener("resize", syncCanvas);
    return () => window.removeEventListener("resize", syncCanvas);
  }, []);

  useEffect(() => {
    syncCanvas();
    drawAnnotations();
  }, [videoFileUrl, annotations, currentBox]);

  // =============================
  // DRAW ANNOTATIONS
  // =============================
  const drawAnnotations = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    annotations.forEach((a) => {
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.strokeRect(a.x, a.y, a.width, a.height);
      ctx.font = "14px Arial";
      ctx.fillStyle = "lime";
      ctx.fillText(a.label, a.x + 4, a.y + 14);
    });
    if (currentBox) {
      ctx.strokeStyle = "red";
      ctx.setLineDash([6]);
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
      ctx.setLineDash([]);
    }
  };

  // =============================
  // MOUSE COORDS
  // =============================
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // =============================
  // DRAW BOXES (MOUSE EVENTS)
  // =============================
  const handleMouseDown = (e) => {
    if (selectedTool !== "draw") return;
    setIsDrawing(true);
    const pos = getCanvasCoords(e);
    setCurrentBox({ x: pos.x, y: pos.y, width: 0, height: 0, label: activeLabel });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentBox) return;
    const pos = getCanvasCoords(e);
    setCurrentBox({
      ...currentBox,
      width: pos.x - currentBox.x,
      height: pos.y - currentBox.y,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;
    setIsDrawing(false);
    let { x, y, width, height } = currentBox;
    if (width < 0) {
      x += width;
      width = -width;
    }
    if (height < 0) {
      y += height;
      height = -height;
    }
    setAnnotations([...annotations, { x, y, width, height, label: currentBox.label }]);
    setCurrentBox(null);
  };

  // =============================
  // VIDEO CONTROLS
  // =============================
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const replayVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play();
  };

  const enterFullscreen = () => {
    const video = videoRef.current;
    if (video.requestFullscreen) video.requestFullscreen();
  };

  const handleVideoClick = () => {
    togglePlayPause();
  };

  const handleVideoDoubleClick = () => {
    enterFullscreen();
  };

  const handleVideoRightClick = (e) => {
    e.preventDefault();
    replayVideo();
  };

  // =============================
  // KEYBOARD SHORTCUTS
  // =============================
  useEffect(() => {
    const handleKeyDown = (e) => {
      const video = videoRef.current;
      switch (e.key.toLowerCase()) {
        case " ": // space to play/pause
          e.preventDefault();
          togglePlayPause();
          break;
        case "f": // fullscreen
          enterFullscreen();
          break;
        case "r": // replay
          replayVideo();
          break;
        case "u": // undo
          setAnnotations((prev) => prev.slice(0, -1));
          break;
        case "d": // draw mode
          setSelectedTool("draw");
          break;
        case "s": // select mode
          setSelectedTool("select");
          break;
        case "delete": // delete last
        case "backspace":
          setAnnotations((prev) => prev.slice(0, -1));
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // =============================
  // TOOL & LABEL MANAGEMENT
  // =============================
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (videoFileUrl) URL.revokeObjectURL(videoFileUrl);
      const url = URL.createObjectURL(file);
      setVideoFileUrl(url);
      setAnnotations([]);
    }
  };

  const handleExport = () => {
    const exportData = JSON.stringify(annotations, null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "annotations.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const addLabel = () => {
    if (newLabel.trim() && !labels.includes(newLabel)) {
      setLabels([...labels, newLabel.trim()]);
      setActiveLabel(newLabel.trim());
      setNewLabel("");
    }
  };

  const deleteLabel = (labelToDelete) => {
    setLabels(labels.filter((l) => l !== labelToDelete));
    if (activeLabel === labelToDelete) setActiveLabel(labels[0] || "");
  };

  // =============================
  // RENDER
  // =============================
  return (
    <div style={{ fontFamily: "Arial, sans-serif", margin: 20 }}>
      <header style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Video Annotation System
      </header>

      <div style={{ display: "flex", gap: 20 }}>
        {/* SIDEBAR */}
        <aside style={{ width: 200, border: "1px solid #ccc", padding: 10 }}>
          <div>
            <h3>Labels</h3>
            {labels.map((label) => (
              <div key={label} style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="radio"
                  name="labels"
                  checked={activeLabel === label}
                  onChange={() => setActiveLabel(label)}
                />
                <label style={{ marginLeft: 6, flex: 1 }}>{label}</label>
                <button
                  onClick={() => deleteLabel(label)}
                  style={{
                    background: "red",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 5px",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <div style={{ marginTop: 10 }}>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="New label"
                style={{ width: "100%", marginBottom: 5 }}
              />
              <button
                onClick={addLabel}
                style={{
                  width: "100%",
                  background: "#4caf50",
                  color: "white",
                  border: "none",
                  padding: "5px",
                  cursor: "pointer",
                }}
              >
                Add Label
              </button>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <h3>Tools</h3>
            {["select", "draw", "undo"].map((tool) => (
              <button
                key={tool}
                onClick={() => {
                  if (tool === "undo") setAnnotations((prev) => prev.slice(0, -1));
                  else setSelectedTool(tool);
                }}
                style={{
                  marginTop: 5,
                  width: "100%",
                  padding: "6px",
                  backgroundColor: selectedTool === tool ? "#4caf50" : "#eee",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {tool.charAt(0).toUpperCase() + tool.slice(1)}
              </button>
            ))}
          </div>
        </aside>

        {/* MAIN AREA */}
        <section>
          <div
            style={{
              width: 800,
              height: 450,
              border: "3px solid #000",
              position: "relative",
              marginBottom: 10,
            }}
          >
            <video
              ref={videoRef}
              src={videoFileUrl}
              width="100%"
              height="100%"
              controls
              style={{ display: "block", backgroundColor: "#000", cursor: "pointer" }}
              onClick={handleVideoClick}
              onDoubleClick={handleVideoDoubleClick}
              onContextMenu={handleVideoRightClick}
            />
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", top: 0, left: 0 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
          </div>

          {/* CUSTOM VIDEO CONTROLS */}
          <div>
            <input type="file" accept="video/*" onChange={handleUpload} />
            <button onClick={togglePlayPause} style={{ marginLeft: 10 }}>
              ▶️ / ⏸️
            </button>
            <button onClick={replayVideo} style={{ marginLeft: 10 }}>
              🔁 Replay
            </button>
            <button onClick={enterFullscreen} style={{ marginLeft: 10 }}>
              ⛶ Fullscreen
            </button>
            <button onClick={handleExport} style={{ marginLeft: 10 }}>
              💾 Export
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
