COMPOSE=cd infra && docker compose

up:
	$(COMPOSE) --env-file .env up -d --build

down:
	$(COMPOSE) --env-file .env down

logs:
	$(COMPOSE) logs -f --tail=200

ps:
	$(COMPOSE) ps
