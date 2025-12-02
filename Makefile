.PHONY: install install-backend install-frontend run stop

install: install-backend install-frontend

install-backend:
	python3 -m venv backend/venv
	backend/venv/bin/pip install -r backend/requirements.txt

install-frontend:
	npm install

run:
	@echo "Starting Backend (port 8000) and Frontend..."
	@echo "Press Ctrl+C to stop."
	@(trap 'kill 0' SIGINT; \
	backend/venv/bin/uvicorn backend.main:app --reload --port 8000 & \
	npm run dev)

stop:
	@echo "Stopping application..."
	-fuser -k 8000/tcp
	-fuser -k 5173/tcp
