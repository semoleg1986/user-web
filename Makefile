SHELL := /bin/bash

.PHONY: help up down restart logs ps

help: ## Показать список команд
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	| sort \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Поднять user-web
	docker-compose up -d --build

down: ## Остановить user-web
	docker-compose down

restart: ## Перезапустить user-web
	docker-compose down
	docker-compose up -d --build

logs: ## Логи user-web
	docker-compose logs -f user-web

ps: ## Статус контейнеров
	docker-compose ps
