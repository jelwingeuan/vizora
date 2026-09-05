from pathlib import Path

from fastapi.testclient import (
    TestClient,
)

from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from app.models.board_image import (
    BoardImage,
)

from app.models.image import (
    Image,
)

from app.models.image_analysis import (
    ImageAnalysisRecord,
)

from app.models.image_embedding import (
    ImageEmbeddingRecord,
)


def test_image_delete_cascades(
    client: TestClient,
    db_session: Session,
    uploads_dir: Path,
    upload_image,
):
    image_payload = (
        upload_image(
            "cascade-test.png",
        )
    )


    board_response = (
        client.post(
            "/api/boards",

            json={
                "name":
                    "Cascade Board",

                "description":
                    "Deletion test",
            },
        )
    )

    assert (
        board_response.status_code
        == 201
    )

    board = (
        board_response.json()
    )


    membership_response = (
        client.post(
            (
                "/api/boards/"
                f"{board['id']}"
                "/images/"
                f"{image_payload['id']}"
            )
        )
    )

    assert (
        membership_response.status_code
        == 200
    )


    image_record = (
        db_session.scalar(
            select(
                Image,
            )
            .where(
                Image.public_id
                == image_payload["id"],
            )
        )
    )

    assert (
        image_record
        is not None
    )


    internal_image_id = (
        image_record.id
    )

    stored_file = (
        uploads_dir
        / image_record.stored_filename
    )

    assert (
        stored_file.exists()
    )


    analysis = (
        ImageAnalysisRecord(
            image_id=(
                internal_image_id
            ),

            summary=(
                "Test summary"
            ),

            subject=(
                "Test subject"
            ),

            style=[
                "editorial",
            ],

            mood=[
                "calm",
            ],

            lighting=(
                "soft"
            ),

            composition=(
                "centered"
            ),

            color_palette=[
                "#111111",
            ],

            tags=[
                "test",
            ],

            creative_notes=(
                "Test notes"
            ),
        )
    )


    embedding = (
        ImageEmbeddingRecord(
            image_id=(
                internal_image_id
            ),

            embedding=[
                0.1,
                0.2,
                0.3,
            ],

            dimensions=3,

            model=(
                "test-embedding-model"
            ),
        )
    )


    db_session.add_all(
        [
            analysis,
            embedding,
        ],
    )

    db_session.commit()


    list_response = (
        client.get(
            "/api/images",
        )
    )

    assert (
        list_response.status_code
        == 200
    )

    listed_image = next(
        image
        for image
        in list_response.json()
        if (
            image["id"]
            == image_payload["id"]
        )
    )

    assert (
        listed_image[
            "analysis"
        ][
            "summary"
        ]
        == "Test summary"
    )


    delete_response = (
        client.delete(
            (
                "/api/images/"
                f"{image_payload['id']}"
            )
        )
    )

    assert (
        delete_response.status_code
        == 204
    )


    db_session.expire_all()


    deleted_image = (
        db_session.scalar(
            select(
                Image,
            )
            .where(
                Image.id
                == internal_image_id,
            )
        )
    )

    assert (
        deleted_image
        is None
    )


    deleted_analysis = (
        db_session.scalar(
            select(
                ImageAnalysisRecord,
            )
            .where(
                ImageAnalysisRecord.image_id
                == internal_image_id,
            )
        )
    )

    assert (
        deleted_analysis
        is None
    )


    deleted_embedding = (
        db_session.scalar(
            select(
                ImageEmbeddingRecord,
            )
            .where(
                ImageEmbeddingRecord.image_id
                == internal_image_id,
            )
        )
    )

    assert (
        deleted_embedding
        is None
    )


    deleted_membership = (
        db_session.scalar(
            select(
                BoardImage,
            )
            .where(
                BoardImage.image_id
                == internal_image_id,
            )
        )
    )

    assert (
        deleted_membership
        is None
    )


    assert (
        not stored_file.exists()
    )


    assert (
        list(
            uploads_dir.glob(
                ".delete-*",
            )
        )
        == []
    )


    boards_response = (
        client.get(
            "/api/boards",
        )
    )

    assert (
        boards_response.status_code
        == 200
    )

    stored_board = next(
        item
        for item
        in boards_response.json()
        if (
            item["id"]
            == board["id"]
        )
    )

    assert (
        stored_board[
            "image_ids"
        ]
        == []
    )