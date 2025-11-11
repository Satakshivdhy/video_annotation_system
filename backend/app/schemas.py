from pydantic import BaseModel
from typing import List, Optional

class AnnotationIn(BaseModel):
    frame: int
    x: float
    y: float
    width: float
    height: float
    label: Optional[str] = None

class SaveAnnotationsRequest(BaseModel):
    video_id: int
    fps: Optional[float] = 30.0
    annotations: List[AnnotationIn]

class VideoOut(BaseModel):
    id: int
    filename: str
