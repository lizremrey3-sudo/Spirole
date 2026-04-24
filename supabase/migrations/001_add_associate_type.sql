-- Add associate_type enum and column to scenarios

create type associate_type as enum ('manager', 'optician', 'technician', 'receptionist');

alter table scenarios
  add column associate_type associate_type not null default 'manager';
