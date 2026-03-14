-- Enforce required field constraints on recipes table.
-- title must be non-empty, ingredients must have >= 2 items, steps must have >= 1 item.

-- Title: NOT NULL + non-empty
alter table public.recipes
  alter column title set not null;

alter table public.recipes
  add constraint recipes_title_not_empty
  check (trim(title) <> '');

-- Ingredients: at least 2 items
alter table public.recipes
  add constraint recipes_min_ingredients
  check (jsonb_array_length(ingredients) >= 2);

-- Steps: at least 1 item
alter table public.recipes
  add constraint recipes_min_steps
  check (jsonb_array_length(steps) >= 1);
