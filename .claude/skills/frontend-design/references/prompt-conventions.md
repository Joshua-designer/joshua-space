# Prompt Conventions

## Structure

- Use headings exactly as defined by each agent
- Use short bullet points when possible
- Keep sections dense and non-redundant

## Decision Labels

- `Confirmed`: directly supported by input or prior-step output
- `[Hypothesis]`: not confirmed, inferred for progress
- `Assumption`: missing input filled to proceed

## Sequencing

- Never skip dependency order without explicit reason
- Do not introduce UI details in PO output
- Do not introduce visual styling in UI Designer output
