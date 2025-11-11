import React, { useRef, useState, useEffect } from "react";
import VideoAnnotator from "./VideoAnnotator.jsx";

const API_BASE = "http://127.0.0.1:8000";



export default function App() {
  // const API_BASE = "http://127.0.0.1:8000";

  return (
    <div>
      <h1>Video Annotation System</h1>
      <VideoAnnotator apiBase={API_BASE} />
    </div>
  );
}



