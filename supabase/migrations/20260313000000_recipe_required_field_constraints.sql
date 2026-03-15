-- Enforce required field constraints on recipes table.
-- title must be non-empty, ingredients must have >= 2 items, steps must have >= 1 item.
-- Uses NOT VALID + VALIDATE to avoid blocking on existing violating rows that are
-- typically scan drafts or incomplete imports; new inserts/updates will be checked.

-- Title: NOT NULL + non-empty
alter table public.recipes
  alter column title set not null;

alter table public.recipes
  add constraint recipes_title_not_empty
  check (trim(title) <> '') not valid;

-- Ingredients: at least 2 items (NOT VALID — existing scan drafts may violate)
alter table public.recipes
  add constraint recipes_min_ingredients
  check (jsonb_array_length(ingredients) >= 2) not valid;

-- Steps: at least 1 item (NOT VALID — existing scan drafts may violate)
alter table public.recipes
  add constraint recipes_min_steps
  check (jsonb_array_length(steps) >= 1) not valid;
