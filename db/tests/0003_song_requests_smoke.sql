-- Run only against an explicitly identified non-production database after migration 0003.
BEGIN;
INSERT INTO song_request_rounds (id,name,status,capacity,reopen_status)
VALUES ('00000000-0000-4000-8000-000000000301','Migration smoke test','open',5,'open');
INSERT INTO song_requests (id,round_id,public_reference,private_token_hash,private_token_encrypted,bizum_name,whatsapp_number,amount_cents,reserved_song_count,payment_mode,status,expires_at)
VALUES ('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000301','MC-4827',repeat('a',64),'test-only-ciphertext','Migration Test','+34600123456',100,1,'manual_bizum','pending_manual_payment',now()+interval '30 minutes');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM song_requests WHERE whatsapp_number='+34600123456' AND public_reference='MC-4827') THEN
    RAISE EXCEPTION 'manual Bizum pass smoke insert failed';
  END IF;
END $$;
ROLLBACK;
