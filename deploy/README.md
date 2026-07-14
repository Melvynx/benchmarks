# VPS deployment

The comparison website runs as an unprivileged systemd service and binds only
to `127.0.0.1:9080`. A Cloudflare Tunnel publishes that origin at
`benchmark.melvynx.dev`.

## Install

```bash
gh repo clone Melvynx/benchmarks /opt/benchmarks
cd /opt/benchmarks
corepack enable
CI=true corepack pnpm install --frozen-lockfile
CI=true corepack pnpm test
CI=true corepack pnpm typecheck
CI=true corepack pnpm build

id benchmark >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin benchmark
chown -R root:benchmark /opt/benchmarks
chmod -R g+rX /opt/benchmarks
install -m 0644 deploy/benchmark.service /etc/systemd/system/benchmark.service
systemctl daemon-reload
systemctl enable --now benchmark.service
curl --fail http://127.0.0.1:9080/
```

Historical generated-app `dist/` directories are deployment artifacts and are
not stored in Git. Synchronize verified historical builds separately when their
previews should be available on the public catalog.

## Update

```bash
cd /opt/benchmarks
git pull --ff-only
CI=true corepack pnpm install --frozen-lockfile
CI=true corepack pnpm test
CI=true corepack pnpm typecheck
CI=true corepack pnpm build
systemctl restart benchmark.service
curl --fail http://127.0.0.1:9080/
```
