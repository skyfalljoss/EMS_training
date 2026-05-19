.PHONY: install run tests

install:
	cd backend && pip install -r requirements.txt

run:
	cd backend && uvicorn app.main:app --reload

tests:
	cd backend && pytest --cov=app tests/

test-cov:
	cd backend && pytest --cov=app tests/ --cov-report=html

rm-cache:

	cd backend && find . -type d -name "__pycache__" -exec rm -r {} \+

# Frontend commands
fe-install:
	cd frontend && npm install
fe-run:
	cd frontend && npm run dev
fe-test:
	cd frontend && npm run test
fe-test-cov:
	cd frontend && npm run test -- --coverage

fe-build:
	cd frontend && npm run build