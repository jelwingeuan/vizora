from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.orm import (
    Session,
)

from app.core.database import (
    get_db,
)

from app.schemas.search import (
    SearchResponse,
    SearchResult,
    SemanticSearchRequest,
)

from app.services.image_service import (
    ImageSizeError,
    ImageStorageError,
    find_stored_image_by_public_id,
)

from app.services.library_index import (
    LibraryIndexError,
    RankedImage,
    SearchConfigurationError,
    find_similar_images,
    search_library,
)

from app.services.visual_ai import (
    AIConfigurationError,
    AIServiceError,
    VisualAI,
    get_visual_ai,
)


router = APIRouter(
    prefix="/api/search",
    tags=["search"],
)


@router.post(
    "/semantic",
    response_model=SearchResponse,
)
def run_semantic_search(
    request: SemanticSearchRequest,

    database: Session = Depends(
        get_db,
    ),

    ai: VisualAI = Depends(
        get_visual_ai,
    ),
):
    query = request.query.strip()

    if not query:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),

            detail=(
                "Search query cannot be empty."
            ),
        )

    try:
        return create_search_response(
            search_library(
                database,
                ai,
                query,
            )
        )

    except (
        AIConfigurationError,
        SearchConfigurationError,
    ) as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error

    except AIServiceError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=str(error),
        ) from error

    except LibraryIndexError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error


@router.post(
    "/similar/{image_id}",
    response_model=SearchResponse,
)
def run_similarity_search(
    image_id: str,

    database: Session = Depends(
        get_db,
    ),

    ai: VisualAI = Depends(
        get_visual_ai,
    ),
):
    source = (
        find_stored_image_by_public_id(
            database,
            image_id,
        )
    )

    if source is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),

            detail=(
                "The stored image "
                "could not be found."
            ),
        )

    try:
        return create_search_response(
            find_similar_images(
                database,
                ai,
                source,
            )
        )

    except AIConfigurationError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error

    except AIServiceError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=str(error),
        ) from error

    except ImageSizeError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_413_CONTENT_TOO_LARGE
            ),
            detail=str(error),
        ) from error

    except (
        ImageStorageError,
        LibraryIndexError,
    ) as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error


def create_search_response(
    ranked_images: list[RankedImage],
) -> SearchResponse:
    return SearchResponse(
        results=[
            SearchResult(
                id=ranked.id,
                score=ranked.score,
            )
            for ranked in ranked_images
        ],
    )
