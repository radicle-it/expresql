# Connessione SQLcl a Oracle Autonomous Database
# Utente: nm33  |  Wallet: C:\wallet\Wallet_meteora.zip
#
# Servizi disponibili nel wallet (vedere tnsnames.ora dentro il zip):
#   meteora_high       — massima priorità, parallelismo
#   meteora_medium     — uso generale  ← default
#   meteora_low        — batch / reporting
#   meteora_tp         — transaction processing
#   meteora_tpurgent   — TP alta priorità
#
# Uso:
#   .\mle\connect.ps1                        # si connette con meteora_medium
#   .\mle\connect.ps1 -Service meteora_tp    # servizio custom

param(
    [string]$User    = "nm33",
    [string]$Wallet  = "C:\wallet\Wallet_meteora.zip",
    [string]$Service = "meteora_medium"
)

$connectScript = @"
set cloudconfig $Wallet
connect ${User}@${Service}
"@

$tmpFile = [System.IO.Path]::GetTempFileName() + ".sql"
$connectScript | Out-File -FilePath $tmpFile -Encoding utf8

Write-Host "Connessione a $User@$Service ..."
Write-Host "Wallet: $Wallet"
Write-Host ""

sql /nolog "@$tmpFile"

Remove-Item $tmpFile -ErrorAction SilentlyContinue
