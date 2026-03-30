from ssh_client import connect, run

client = connect()
try:
    for path in [
        "/etc/nginx/sites-available/sma.nmiczd.ru",
        "/etc/nginx/sites-available/nmiczd.ru",
    ]:
        print(f"\n===== {path} =====\n")
        _, out, err = run(client, f"sudo cat {path} 2>/dev/null || cat {path}")
        print(out)
finally:
    client.close()
