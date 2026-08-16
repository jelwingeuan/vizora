from pydantic import BaseModel


class ImageAnalysis(BaseModel):
    summary: str
    subject: str

    style: list[str]
    mood: list[str]

    lighting: str
    composition: str

    color_palette: list[str]
    tags: list[str]

    creative_notes: str