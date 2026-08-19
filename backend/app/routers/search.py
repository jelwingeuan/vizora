from fastapi import (
    APIRouter,
    HTTPException,
    status,
)

from app.schemas.search import (
    SemanticSearchRequest,
    SemanticSearchResponse,
)

from app.services.search_service import (
    SearchConfigurationError,
    SemanticSearchError,
    semantic_search,
)


router = APIRouter(
    prefix="/api/search",
    tags=["search"],
)


@router.post(
    "/semantic",
    response_model=SemanticSearchResponse,
)
async def run_semantic_search(
    request: SemanticSearchRequest,
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
        results = await semantic_search(
            query=query,
            items=request.items,
        )

        return SemanticSearchResponse(
            results=results,
        )

    except SearchConfigurationError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error

    except SemanticSearchError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=str(error),
        ) from error