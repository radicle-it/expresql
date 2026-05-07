-- Comandi di connessione SQLcl (eseguire manualmente dentro SQLcl)
-- Utente: nm33  |  Wallet: C:\wallet\Wallet_meteora.zip
--
-- Servizi disponibili (vedere tnsnames.ora dentro il wallet zip):
--   meteora_high       -- massima priorità, parallelismo
--   meteora_medium     -- uso generale
--   meteora_low        -- batch / reporting
--   meteora_tp         -- transaction processing
--   meteora_tpurgent   -- TP alta priorità

set cloudconfig C:\wallet\Wallet_meteora.zip
connect nm33@meteora_medium
