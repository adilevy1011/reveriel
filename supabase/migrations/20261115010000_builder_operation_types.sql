-- Harden the builder operation contract without changing the already-applied
-- builder drafts migration.
alter table public.builder_draft_operations
  drop constraint if exists builder_draft_operations_operation_type_check;

alter table public.builder_draft_operations
  add constraint builder_draft_operations_operation_type_check
  check (operation_type in (
    'set',
    'set-content',
    'set-style',
    'set-responsive-style',
    'create-file',
    'delete-asset',
    'upload-asset'
  ));
