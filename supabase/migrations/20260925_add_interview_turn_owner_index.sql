create index if not exists interview_turns_session_owner_idx
  on public.interview_turns(session_id, user_id);
