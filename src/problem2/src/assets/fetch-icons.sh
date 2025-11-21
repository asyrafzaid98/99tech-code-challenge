New-Item -ItemType Directory -Force -Path "public\tokens" | Out-Null

$symbols = @("ETH","USDT","BTC","USD","GMX","ATOM","OSMO","ZIL","LUNA","BLUR","BUSD","bNEO","stEVMOS","rATOM","STRD","EVMOS","IBCX","IRIS","ampLUNA","KUJI","stOSMO","USDC","axlUSDC","stATOM","rSWTH","stLUNA","LSI","OKB","OKT","SWTH","USC","WBTC","wstETH","YieldUSD")

foreach ($s in $symbols) {
    $url = "https://github.com/Switcheo/token-icons/tree/main/tokens/$s.svg"
    $dest = "public\tokens\$s.svg"
    Write-Host "Downloading $s.svg..."
    Invoke-WebRequest -Uri $url -OutFile $dest -ErrorAction SilentlyContinue
}
Write-Host "Done!"