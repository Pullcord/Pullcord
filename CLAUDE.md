@AGENTS.md

# CLAUDE.md — mapa de Pullcord

Las reglas duras viven en [AGENTS.md](AGENTS.md), importadas arriba. Este
archivo es el mapa, no el reglamento.

## Público: lo que tiene un clon del repo

| Archivo | Qué es |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Reglas del proyecto. Léelo primero. |
| [README.md](README.md) | Qué es Pullcord y su estado |
| [LICENSE](LICENSE) | Apache License 2.0 |
| [.mcp.json](.mcp.json) | Raven MCP (`https://raven.stellar.org/mcp`, OAuth; entrar con `/mcp`) |
| [.gitignore](.gitignore) | Excluye lo local de abajo y secretos |

## Local: existe en esta máquina, NO está en el repo

Un clon no tiene estos archivos. No los cites desde un archivo público.

- `playbooks/`: notas de investigación y procesos del equipo.
- `.claude/`: todas las skills (`public-claim-verify`, `doc-accuracy-audit`, `claude-antigravity-setup`, `full-context-loading`, `hackathon-fit-check`, `grants-track-record`, `teammate-commit-identity`, `mexico-legal-check`, `ecosystem-skills-installer`, `repo-security-sweep`) y el comando `session-close.md`.

## Stellar

Antes de afirmar cualquier hecho de Stellar, consulta Raven. Si la respuesta
no sale de Raven o de una fuente primaria, márcala como inferencia.

Las skills de Stellar no están en el repo. Se instalan en WSL. El `$HOME` de
WSL no ve las skills instaladas en Windows.

## Memoria

La memoria persistente vive fuera del repo, en
`~/.claude/projects/-home-vaiosvaios-Pullcord/memory/`, indexada en `MEMORY.md`.
Ahí van el contexto privado, las decisiones de financiamiento y lo que no debe
llegar a git. Nunca se copia al repo.

## Estado

Repo configurado (2026-10-03). `main` en `3aa2b67`, publicado en `origin`
(`Pullcord/Pullcord`, público). Código del MVP en la rama
`feat/mvp-read-engine`: motor de lectura de solo lectura, API con ruta gratis y
ruta de pago x402 (desactivada sin configuración), pruebas con datos sintéticos.
Sin desplegar y sin mergear a `main`. No se ha creado ningún paquete npm.
