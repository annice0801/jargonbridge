import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicUrl, isBlockedAddress } from "../lib/url-guard.ts";

test("擋下內網與 metadata 位址", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "not-an-ip"]) {
    assert.equal(isBlockedAddress(address), true, address);
  }
});

test("放行公開位址", () => {
  for (const address of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) {
    assert.equal(isBlockedAddress(address), false, address);
  }
});

test("拒絕非 http 協定與內網網址", async () => {
  await assert.rejects(assertPublicUrl("file:///etc/passwd"));
  await assert.rejects(assertPublicUrl("http://127.0.0.1:27017"));
  await assert.rejects(assertPublicUrl("http://[::1]/"));
  await assert.rejects(assertPublicUrl("http://169.254.169.254/latest/meta-data"));
});
