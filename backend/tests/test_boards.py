from fastapi.testclient import (
    TestClient,
)


def test_board_image_membership(
    client: TestClient,
    upload_image,
):
    image = (
        upload_image(
            "board-reference.png",
        )
    )


    board_response = (
        client.post(
            "/api/boards",

            json={
                "name":
                    "  Mood   Board  ",

                "description":
                    "  Warm   editorial  ",
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

    assert (
        board["name"]
        == "Mood Board"
    )

    assert (
        board["description"]
        == "Warm editorial"
    )

    assert (
        board["image_ids"]
        == []
    )


    add_response = (
        client.post(
            (
                "/api/boards/"
                f"{board['id']}"
                "/images/"
                f"{image['id']}"
            )
        )
    )

    assert (
        add_response.status_code
        == 200
    )

    assert (
        add_response.json()[
            "image_ids"
        ]
        == [
            image["id"],
        ]
    )


    duplicate_response = (
        client.post(
            (
                "/api/boards/"
                f"{board['id']}"
                "/images/"
                f"{image['id']}"
            )
        )
    )

    assert (
        duplicate_response.status_code
        == 200
    )

    assert (
        duplicate_response.json()[
            "image_ids"
        ]
        == [
            image["id"],
        ]
    )


    list_response = (
        client.get(
            "/api/boards",
        )
    )

    assert (
        list_response.status_code
        == 200
    )

    assert (
        list_response.json()[0][
            "image_ids"
        ]
        == [
            image["id"],
        ]
    )


    remove_response = (
        client.delete(
            (
                "/api/boards/"
                f"{board['id']}"
                "/images/"
                f"{image['id']}"
            )
        )
    )

    assert (
        remove_response.status_code
        == 200
    )

    assert (
        remove_response.json()[
            "image_ids"
        ]
        == []
    )


def test_missing_board_returns_404(
    client: TestClient,
    upload_image,
):
    image = (
        upload_image()
    )

    response = (
        client.post(
            (
                "/api/boards/"
                "missing-board"
                "/images/"
                f"{image['id']}"
            )
        )
    )

    assert (
        response.status_code
        == 404
    )