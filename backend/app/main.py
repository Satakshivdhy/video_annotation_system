from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select
from typing import List

from database import init_db, get_session
from models import Video, Annotation
from schemas import SaveAnnotationsRequest, VideoOut

app = FastAPI(title="Annotation API")

# Allow CORS from frontend (adjust origin in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB on startup
@app.on_event("startup")
def on_startup():
    init_db()

# ------------------------------------------------------------------
# Video endpoints (simple)
# ------------------------------------------------------------------
@app.post("/videos/", response_model=VideoOut)
def create_video(video: Video):
    with get_session() as session:
        session.add(video)
        session.commit()
        session.refresh(video)
        return VideoOut(id=video.id, filename=video.filename)

@app.get("/videos/", response_model=List[VideoOut])
def list_videos():
    with get_session() as session:
        videos = session.exec(select(Video)).all()
        return [VideoOut(id=v.id, filename=v.filename) for v in videos]

# ------------------------------------------------------------------
# Annotation endpoints
# ------------------------------------------------------------------
@app.post("/annotations/save/")
def save_annotations(payload: SaveAnnotationsRequest):
    with get_session() as session:
        # check video exists
        video = session.get(Video, payload.video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")

        # save each annotation
        db_annotations = []
        for ann in payload.annotations:
            db_ann = Annotation(
                video_id=payload.video_id,
                frame=ann.frame,
                x=ann.x,
                y=ann.y,
                width=ann.width,
                height=ann.height,
                label=ann.label,
            )
            session.add(db_ann)
            db_annotations.append(db_ann)
        session.commit()

        return {"message": "saved", "count": len(db_annotations)}

@app.get("/annotations/{video_id}", response_model=List[dict])
def get_annotations(video_id: int):
    with get_session() as session:
        anns = session.exec(select(Annotation).where(Annotation.video_id == video_id)).all()
        # return plain dictionaries
        return [
            {
                "id": a.id,
                "video_id": a.video_id,
                "frame": a.frame,
                "x": a.x,
                "y": a.y,
                "width": a.width,
                "height": a.height,
                "label": a.label,
            }
            for a in anns
        ]
