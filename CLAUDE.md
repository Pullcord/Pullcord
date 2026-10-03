@AGENTS.md

# CLAUDE.md — mapa de Pullcord

Las reglas duras viven en [AGENTS.md](AGENTS.md), importadas arriba. Este
archivo es el mapa, no el reglamento.

## Público: lo que tiene un clon del repo

| Archivo | Qué es |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Reglas del proyecto. Léelo primero. |
| [.mcp.json](.mcp.json) | Raven MCP (`https://raven.stellar.org/mcp`, OAuth; entrar con `/mcp`) |
| [.gitignore](.gitignore) | Excluye lo local de abajo y secretos |
| `.claude/skills/public-claim-verify/` | Verificar un claim antes de publicarlo |
| `.claude/skills/doc-accuracy-audit/` | Auditar que la documentación pública sea exacta |
| `.claude/skills/claude-antigravity-setup/` | Configurar un proyecto para Claude Code y Antigravity |
| `.claude/skills/full-context-loading/` | Responder con el contexto ya disponible, sin releer todo |
| `.claude/skills/hackathon-fit-check/` | Revisar si un hackathon encaja |
| `.claude/skills/grants-track-record/` | Verificar el historial de un programa de grants |

## Local: existe en esta máquina, NO está en el repo

Un clon no tiene estos archivos. No los cites desde un archivo público.

- `playbooks/`: notas de investigación y procesos del equipo.
- `.claude/skills/teammate-commit-identity/`: actuar bajo la identidad de GitHub de otra persona.
- `.claude/skills/mexico-legal-check/`: revisar un producto contra la regulación mexicana.
- `.claude/skills/ecosystem-skills-installer/`: encontrar, verificar e instalar skills de un ecosistema.
- `.claude/skills/repo-security-sweep/`: buscar exposición en los repos reales de una cuenta.
- `.claude/commands/session-close.md`: revisión de higiene al cerrar sesión.

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

Repo recién configurado (2026-10-03). Sin commits todavía y sin código del
producto. El remoto `origin` apunta a `Eras256/Pullcord` (público, vacío). No se
ha creado la org `pullcord` ni ningún paquete npm.
