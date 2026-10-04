// SSRF guard for webhook delivery. The host is resolved at connect time by a
// custom `lookup`, and the connection goes to the exact address that passed
// the check, so a DNS answer cannot change between check and connect
// (rebinding). Redirects are never followed.
import { BlockList, isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns";
import http from "node:http";
import https from "node:https";

const blocked = new BlockList();
// IPv4: this-network, private, CGNAT, loopback, link-local (cloud metadata
// 169.254.169.254), IETF/TEST-NETs, benchmarking, multicast, reserved, broadcast.
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
]) blocked.addSubnet(net, prefix, "ipv4");
// IPv6: unspecified, loopback, unique-local (Fly's private network fdaa::/16 and
// AWS metadata fd00:ec2::254 fall here), link-local, multicast, documentation.
blocked.addAddress("::", "ipv6");
blocked.addAddress("::1", "ipv6");
for (const [net, prefix] of [["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["2001:db8::", 32]]) blocked.addSubnet(net, prefix, "ipv6");

// IPv4 embedded in IPv6: mapped (::ffff:a.b.c.d), and NAT64 (64:ff9b::/96).
function embeddedV4(ip) {
  const m = ip.match(/^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/i);
  if (m) return m[1];
  const hex = ip.match(/^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hex) return null;
  const n = (parseInt(hex[1], 16) << 16) | parseInt(hex[2], 16);
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
}

export function isBlockedIp(ip) {
  const family = isIP(ip);
  if (family === 4) return blocked.check(ip, "ipv4");
  if (family === 6) {
    const v4 = embeddedV4(ip);
    return v4 ? blocked.check(v4, "ipv4") : blocked.check(ip, "ipv6");
  }
  return true; // not an IP: refuse
}

// Drop-in `lookup` for http(s).request. Resolves every address and refuses the
// host if ANY of them is blocked, so round-robin answers cannot slip one in.
export function guardedLookup(resolve = dnsLookup) {
  return (hostname, options, callback) => {
    if (typeof options === "function") [callback, options] = [options, {}];
    resolve(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err);
      const bad = addresses.find((a) => isBlockedIp(a.address));
      if (bad || addresses.length === 0) {
        const e = new Error(`webhook host ${hostname} resolves to a blocked address${bad ? ` (${bad.address})` : ""}`);
        e.code = "EBLOCKEDHOST";
        return callback(e);
      }
      if (options.all) return callback(null, addresses);
      callback(null, addresses[0].address, addresses[0].family);
    });
  };
}

// Checks a host before storing a subscription (fast feedback). Delivery checks
// again at connect time, which is the check that matters.
export function assertPublicHost(hostname, { resolve = dnsLookup } = {}) {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isBlockedIp(host) ? Promise.reject(Object.assign(new Error("webhook host is not allowed"), { code: "EBLOCKEDHOST" })) : Promise.resolve();
  return new Promise((ok, fail) => guardedLookup(resolve)(host, { all: true }, (err) => (err ? fail(err) : ok())));
}

// POST without following redirects. `allowPrivate` is for local tests only.
export function safePost(url, { headers, body, timeoutMs = 10_000, allowPrivate = false, resolve } = {}) {
  const u = new URL(url);
  const client = u.protocol === "https:" ? https : http;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  return new Promise((ok, fail) => {
    // A literal IP never goes through lookup, so check it here.
    if (!allowPrivate && isIP(host) && isBlockedIp(host)) {
      return fail(Object.assign(new Error(`webhook host ${host} is a blocked address`), { code: "EBLOCKEDHOST" }));
    }
    const req = client.request(
      u,
      {
        method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
        timeout: timeoutMs,
        ...(allowPrivate ? {} : { lookup: guardedLookup(resolve) }),
      },
      (res) => {
        res.resume(); // the response body is not needed
        ok({ status: res.statusCode, location: res.headers.location ?? null });
      },
    );
    req.on("timeout", () => req.destroy(new Error("webhook timeout")));
    req.on("error", fail);
    req.end(body);
  });
}
