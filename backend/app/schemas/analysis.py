from pydantic import BaseModel, field_validator


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

    @field_validator("tags")
    @classmethod
    def normalize_tags(
        cls,
        tags: list[str],
    ) -> list[str]:
        normalized_tags: list[str] = []
        seen: set[str] = set()

        for tag in tags:
            cleaned_tag = " ".join(
                tag.strip().lower().split()
            )

            if not cleaned_tag:
                continue

            if cleaned_tag in seen:
                continue

            seen.add(cleaned_tag)
            normalized_tags.append(
                cleaned_tag
            )

        return normalized_tags[:10]