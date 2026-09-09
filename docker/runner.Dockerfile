# syntax=docker/dockerfile:1.7
# The benchme runner image for this repository: the checkout at the pinned
# commit with dependencies installed, plus /runner.sh which applies a submitted
# patch, drops in hidden files, and prints a JSON report as its last line.
# Contains NO hidden tests — those arrive at run time from the verifier.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git patch ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json tsconfig.json eslint.config.js README.md ./
RUN npm ci --no-audit --no-fund
COPY src ./src
COPY tests ./tests
COPY docs ./docs
COPY data/keys.json ./data/keys.json
COPY docker/runner.sh /runner.sh
RUN chmod +x /runner.sh && chown -R 1001:1001 /app
USER 1001
ENV HOME=/tmp
ENTRYPOINT ["/runner.sh"]
