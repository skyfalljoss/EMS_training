from bson import ObjectId

from app.db.mongodb import get_database
from app.models.user import ActivityLogEntry, UserCreate, UserInDB, UserResponse

COLLECTION = "users"


class DuplicateEmailError(Exception):
    """Raised when trying to create a user with an email that already exists."""
    pass


class UserRepository:
    """MongoDB-backed data access for users."""

    def __init__(self):
        self._db = None

    @property
    def db(self):
        if self._db is None:
            self._db = get_database()
        return self._db

    @property
    def collection(self):
        return self.db[COLLECTION]

    async def create_user(self, user_create: UserCreate, hashed_password: str) -> UserResponse:
        if await self.get_user_by_email(user_create.email):
            raise DuplicateEmailError("Email already registered")
        user_dict = user_create.model_dump()
        # SecretStr -> raw string for storage; never store the plaintext
        user_dict.pop("password", None)
        user_dict["hashed_password"] = hashed_password
        user_dict["role"] = "user"
        user_dict["activity"] = []
        result = await self.collection.insert_one(user_dict)
        return UserResponse(id=str(result.inserted_id), email=user_create.email, role="user")

    async def get_user_by_email(self, email: str) -> UserInDB | None:
        user_data = await self.collection.find_one({"email": email})
        if user_data:
            user_data["id"] = str(user_data.pop("_id"))
            return UserInDB(**user_data)
        return None

    async def append_activity_log(self, user_id: str, activity_log_entry: ActivityLogEntry) -> None:
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"activity": activity_log_entry.model_dump()}},
        )
