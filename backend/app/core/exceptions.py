class DomainError(Exception):
    status_code: int = 500

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

    def __str__(self) -> str:
        return self.message


class NotFoundError(DomainError):
    status_code = 404


class ConflictError(DomainError):
    status_code = 409


class ForbiddenError(DomainError):
    status_code = 403


class ValidationError(DomainError):
    status_code = 400


class InvalidCredentialsError(DomainError):
    status_code = 401


class UnauthorizedError(DomainError):
    status_code = 401
