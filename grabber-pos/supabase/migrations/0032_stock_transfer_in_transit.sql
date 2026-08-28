-- Allow in_transit for inter-branch transfer lifecycle (dispatch → receive).

alter table stock_transfers drop constraint if exists stock_transfers_status_check;
alter table stock_transfers add constraint stock_transfers_status_check
  check (status in ('pending_dispatch', 'in_transit', 'received_approved', 'rejected'));
