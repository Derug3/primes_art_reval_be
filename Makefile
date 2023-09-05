#!make

.DEFAULT_GOAL := restart

include .env
export $(shell sed 's/=.*//' .env)

ifneq ("$(wildcard .env.local)","")
	include .env.local
	export $(shell sed 's/=.*//' .env.local)
endif

ifneq ("$(wildcard .env.${NODE_ENV})","")
	include .env.${NODE_ENV}
	export $(shell sed 's/=.*//' .env.${NODE_ENV})
endif

ifneq ("$(wildcard .env.${NODE_ENV}.local)","")
	include .env.${NODE_ENV}.local
	export $(shell sed 's/=.*//' .env.${NODE_ENV}.local)
endif

ifneq ("$(wildcard docker-compose.${NODE_ENV}.yml)","")
	DOCKER_COMPOSE=docker compose -f "docker-compose.${NODE_ENV}.yml"
else
	DOCKER_COMPOSE=docker compose -f "docker-compose.yml"
endif

ifneq ("$(wildcard docker-compose.override.yml)","")
	DOCKER_COMPOSE := $(DOCKER_COMPOSE) -f "docker-compose.override.yml"
endif

ifneq ("$(wildcard docker-compose.${NODE_ENV}.override.yml)","")
	DOCKER_COMPOSE := $(DOCKER_COMPOSE) -f "docker-compose.${NODE_ENV}.override.yml"
endif

SHELL := env PATH=$(PATH) /bin/bash

down:
	${DOCKER_COMPOSE} down --remove-orphans

up:
	${DOCKER_COMPOSE} up -d

.PHONY: build
build:
	${DOCKER_COMPOSE} build

rebuild:
	${DOCKER_COMPOSE} up -d --build --remove-orphans

force-rebuild:
	make down
	${DOCKER_COMPOSE} build --no-cache
	make up

restart:
	make down
	make up

bash:
	${DOCKER_COMPOSE} exec -it primes_api /bin/sh

sh:
	${DOCKER_COMPOSE} exec -it primes_api /bin/sh

ps:
	${DOCKER_COMPOSE} ps

.PHONY: logs
logs:
	${DOCKER_COMPOSE} logs -f

logs-app:
	${DOCKER_COMPOSE} logs -f primes_api
