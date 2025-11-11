from sqlmodel import SQLModel, Field
from typing import Optional

class Video(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    filename: str
    filepath: str   # ✅ will store path like "uploads/video1.mp4"
    fps: float
    total_frames: int
    duration: float

class Annotation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    video_id: int = Field(foreign_key="video.id")
    frame: int
    x: float
    y: float
    width: float
    height: float
    label: Optional[str] = None