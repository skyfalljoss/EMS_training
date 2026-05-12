import pytest


@pytest.mark.asyncio
async def test_db_connection(test_db):
    """Test that MongoDB connection works."""
    # Verify the database object exists
    assert test_db is not None

    # Ping MongoDB to verify connection
    try:
        result = await test_db.client.admin.command("ping")
        assert result["ok"] == 1
    except Exception as e:
        pytest.fail(f"MongoDB connection failed: {str(e)}")


@pytest.mark.asyncio
async def test_db_collection_crud(test_db):
    """Test basic CRUD operations on a test collection."""
    collection = test_db["test_collection"]

    # Create
    insert_result = await collection.insert_one({"name": "test", "value": 42})
    assert insert_result.inserted_id is not None

    # Read
    doc = await collection.find_one({"_id": insert_result.inserted_id})
    assert doc is not None
    assert doc["name"] == "test"
    assert doc["value"] == 42

    # Update
    await collection.update_one({"_id": insert_result.inserted_id}, {"$set": {"value": 100}})
    updated_doc = await collection.find_one({"_id": insert_result.inserted_id})
    assert updated_doc["value"] == 100

    # Delete
    await collection.delete_one({"_id": insert_result.inserted_id})
    deleted_doc = await collection.find_one({"_id": insert_result.inserted_id})
    assert deleted_doc is None
