from sqlmodel import Session, select
from .models import Video



def create_video(session: Session, video: Video):
    session.add(video)
    session.commit()
    session.refresh(video)
    return video
